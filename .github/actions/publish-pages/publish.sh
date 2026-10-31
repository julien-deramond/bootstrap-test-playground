#!/usr/bin/env bash
# Publishes SITE to TARGET on the gh-pages branch, or removes TARGET when SITE
# is empty (see action.yml).
#
# Each publish replaces the branch with a single commit, with no parent, so
# the built files of every deploy don't pile up in the repository's history.
# main's deploy and the pull requests' previews push to the same branch, each
# from its own run: a push only goes through if the branch is still where it
# was read (--force-with-lease), and starts over from its new state otherwise.
set -euo pipefail

branch=gh-pages

if [[ $TARGET != . && ! $TARGET =~ ^pr-[0-9]+$ ]]; then
  echo "::error::target must be . or pr-<n>, not '$TARGET'"
  exit 1
fi

# The files, where they go on the branch. GitHub Pages runs Jekyll on a branch
# without .nojekyll, which leaves out every file starting with an underscore.
stage=$(mktemp -d)
if [[ -n $SITE ]]; then
  mkdir -p "$stage/$TARGET"
  cp -R "$SITE/." "$stage/$TARGET/"
fi
touch "$stage/.nojekyll"

# A repository of its own, outside the checkout.
repo=$(mktemp -d)
cd "$repo"
git init --quiet
git remote add origin "$GITHUB_SERVER_URL/$GITHUB_REPOSITORY.git"
auth=$(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)
echo "::add-mask::$auth"
git config "http.$GITHUB_SERVER_URL/.extraheader" "AUTHORIZATION: basic $auth"
export GIT_AUTHOR_NAME='github-actions[bot]' GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com'
export GIT_COMMITTER_NAME=$GIT_AUTHOR_NAME GIT_COMMITTER_EMAIL=$GIT_AUTHOR_EMAIL

for attempt in 1 2 3 4 5; do
  status=0
  git ls-remote --exit-code --heads origin "$branch" > /dev/null || status=$?
  case $status in
    0)
      git fetch --quiet --depth=1 origin "+refs/heads/$branch:refs/remotes/origin/$branch"
      base=$(git rev-parse "refs/remotes/origin/$branch")
      git read-tree "$base"
      ;;
    2)
      if [[ -z $SITE ]]; then
        echo "No $branch branch: nothing to remove."
        exit 0
      fi
      base=''
      git read-tree --empty
      ;;
    *) exit "$status" ;;
  esac

  if [[ $TARGET == . ]]; then
    # Everything but the previews.
    git rm -r --cached --quiet --ignore-unmatch -- . ':(exclude,glob)pr-[0-9]*/**'
  else
    git rm -r --cached --quiet --ignore-unmatch -- "$TARGET"
  fi
  # Adds the staged files and keeps what they don't replace.
  git --work-tree="$stage" add --force --no-all -- .

  tree=$(git write-tree)
  if [[ -n $base && $tree == "$(git rev-parse "$base^{tree}")" ]]; then
    echo "$branch already has these files."
    exit 0
  fi

  commit=$(git commit-tree "$tree" -m "$MESSAGE")
  if git push --quiet --force-with-lease="refs/heads/$branch:$base" origin "$commit:refs/heads/$branch"; then
    echo "Pushed ${commit:0:7} to $branch: $MESSAGE"
    exit 0
  fi

  echo "$branch moved while publishing (attempt $attempt), starting over."
  sleep $((attempt * 5 + RANDOM % 5))
done

echo "::error::Couldn't push to $branch: it kept moving."
exit 1
