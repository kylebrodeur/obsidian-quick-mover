import { readFileSync, writeFileSync } from "fs";
import process from 'process';

const targetVersion = process.env.npm_package_version;

// Update manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update versions.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;

// Sort versions in descending order
const sortedVersions = Object.fromEntries(
    Object.entries(versions).sort(([a], [b]) => {
        return -1 * a.localeCompare(b, undefined, { numeric: true });
    })
);

writeFileSync("versions.json", JSON.stringify(sortedVersions, null, 4) + "\n");