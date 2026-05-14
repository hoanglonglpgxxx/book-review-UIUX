# book-review-UIUX

## Pull code from `book-review-app`

If you want to bring the existing `book-review-app` codebase into this repository, run the commands below.
Replace `<OWNER>` with the GitHub username or organization that owns `book-review-app`:

```bash
git remote add book-review-app https://github.com/<OWNER>/book-review-app.git
git fetch book-review-app
git merge --allow-unrelated-histories book-review-app/main
```

The merge command may produce conflicts. If conflicts occur, resolve them, stage the resolved files with `git add`, and complete the merge with `git commit`.

If your source default branch is `master`, replace `book-review-app/main` with `book-review-app/master`.
