//
// SCRIPT: Git postmerge hook, runs after a `git pull` or `git merge`, see
//  https://git-scm.com/docs/githooks#_post_merge
//

const { exec, spawn } = require('child_process');

// Get all files change since the last dangerous HEAD-altering operation
//  (for the difference between HEAD and ORIG_HEAD, see
//  https://stackoverflow.com/a/967611; note that HEAD@{1} is not always
//  the same as ORIG_HEAD depending on what operation took place, so by
//  using ORIG_HEAD, we have a better chance of seeing what changed since
//  the last pull/merge).
// NOTE: we use exec() here instead of spawn() since we don't need to stream
//  the output to the console and exec() returns it all in one chunk once the
//  process is done (so no events to keep track of)
// NOTE: it doesn't matter what directory this is executed from, git will
//  always return full paths from the repo root
exec(
  'git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD',
  function (err, stdout, stderr) {
    if (err) {
      process.stdout.write(`${stdout.toString()}\n\n`);
      process.stderr.write(stderr.toString());
      process.stderr.write(`\n\nERROR: ${err.message}\n`);
      process.exit(1);
    }

    if (stdout.includes('package.json') || stdout.includes('yarn.lock')) {
      console.log(
        'Change detected to yarn.lock or package.json file: Updating dependencies...'
      );

      const cmd = spawn('yarn', ['install'], {
        shell: true,
      });

      cmd.on('close', function (code) {
        process.exit(code);
      });
    }
  }
);
