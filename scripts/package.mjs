import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDirectory = process.cwd();
const stagingDirectory = await mkdtemp(join(tmpdir(), 'matterbridge-hubspace-'));
const releaseFiles = [
    'dist',
    'ACKNOWLEDGEMENTS.md',
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'matterbridge-hubspace.config.json',
    'matterbridge-hubspace.schema.json'
];

try {
    await Promise.all(releaseFiles.map(file => cp(join(rootDirectory, file), join(stagingDirectory, file), { recursive: true })));

    const packageJson = JSON.parse(await readFile(join(rootDirectory, 'package.json'), 'utf8'));
    delete packageJson.devDependencies;
    delete packageJson.scripts;
    await writeFile(join(stagingDirectory, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);

    const result = spawnSync('npm', ['pack', stagingDirectory, '--pack-destination', rootDirectory], {
        cwd: rootDirectory,
        stdio: 'inherit'
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
} finally {
    await rm(stagingDirectory, { recursive: true, force: true });
}