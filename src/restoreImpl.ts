import * as core from "@actions/core";
import * as tar from "tar";
import * as path from "path";
import * as fs from "fs";

import { Events, Inputs, Outputs, State } from "./constants";
import { IStateProvider, StateProvider } from "./stateProvider";
import * as utils from "./utils/actionUtils";

export async function restoreImpl(stateProvider: IStateProvider): Promise<void> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            core.setOutput(Outputs.CacheHit, "false");
            return;
        }

        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const primaryKey = core.getInput(Inputs.Key, { required: true });
        stateProvider.setState(State.CachePrimaryKey, primaryKey);

        const cachePaths = utils.getInputAsArray(Inputs.Path, { required: true });
        const cacheDirectory = "/caching"; // Replace with your actual PVC mount path
        const tarballPath = path.join(cacheDirectory, `${primaryKey}.tar`);

        if (fs.existsSync(tarballPath)) {
            await tar.extract({
                gzip: true,
                file: tarballPath,
                cwd: process.cwd(),
            });

            core.setOutput(Outputs.CacheHit, "true");
            core.info(`Cache restored from key: ${primaryKey}`);
            stateProvider.setState(State.CacheMatchedKey, primaryKey);
        } else {
            core.setOutput(Outputs.CacheHit, "false");
            core.info(`Cache not found for key: ${primaryKey}`);
        }
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("An unknown error occurred.");
        }
    }
}

async function run(stateProvider: IStateProvider, earlyExit: boolean | undefined): Promise<void> {
    try {
        await restoreImpl(stateProvider);
    } catch (err) {
        console.error(err);
        if (earlyExit) {
            process.exit(1);
        }
    }

    if (earlyExit) {
        process.exit(0);
    }
}

export async function restoreOnlyRun(earlyExit?: boolean | undefined): Promise<void> {
    await run(new StateProvider(), earlyExit);
}

export async function restoreRun(earlyExit?: boolean | undefined): Promise<void> {
    await run(new StateProvider(), earlyExit);
}