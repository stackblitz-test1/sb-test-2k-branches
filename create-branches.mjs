import { exec } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
const command = promisify(exec);

main(2_000);

async function main(branchCount = 0) {
  const existing = await getExistingBranches();

  const toCreate = branchNames(branchCount).filter(
    (name) => !existing.includes(name)
  );

  if (existing.length) {
    console.log(`Found ${existing.length} test branches`);
  }

  if (toCreate.length) {
    console.log(`Creating ${toCreate.length} new branches`);
    for (const name of toCreate) {
      await createBranch(name);
    }
  } else {
    console.log('No remaining branches to create');
  }
}

async function createBranch(name) {
  const file = {
    name: name.replace(/keep\//, '') + '.txt',
    data: name + '\n',
  };
  console.log(`Creating branch '${name}' with file '${file.name}'`);
  const startBranch = (
    await command(`git branch --show-current`)
  ).stdout.trim();
  if (startBranch !== 'main') {
    throw new Error(`Starting branch should be 'main', was '${startBranch}'`);
  }

  await command(`git switch --orphan ${name}`);
  fs.writeFileSync(file.name, file.data, { encoding: 'utf8' });
  await command(`git add ${file.name}`);
  await command(`git commit -m 'Add ${file.name}'`);
  await command(`git switch main`);
}

function branchNames(count = 0) {
  const name = (n) => `keep/test-branch-${String(n).padStart(4, '0')}`;
  return Array(count)
    .fill()
    .map((_, index) => name(index + 1));
}

async function getExistingBranches() {
  const { stdout, stderr } = await command(
    `git branch --no-color --list 'keep/*' --format '%(refname:lstrip=2)'`
  );
  if (stderr.length) {
    throw new Error('Could not read existing branches:\n' + stderr);
  }
  return typeof stdout === 'string' ? stdout.trim().split('\n') : [];
}
