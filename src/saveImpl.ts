import * as core from "@actions/core";
import * as tar from "tar";
import * as path from "path";
import * as fs from "fs";
import { Events, Inputs, State } from "./constants";
import { IStateProvider } from "./stateProvider";
import * as utils from "./utils/actionUtils";

// Catch and log any unhandled exceptions.
process.on("uncaughtException", e => utils.logWarning(e.message));

async function saveImpl(stateProvider: IStateProvider): Promise<void> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
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

        const primaryKey = stateProvider.getState(State.CachePrimaryKey) || core.getInput(Inputs.Key);
        if (!primaryKey) {
            utils.logWarning(`Key is not specified.`);
            return;
        }

        const restoredKey = stateProvider.getCacheState();
        if (utils.isExactKeyMatch(primaryKey, restoredKey)) {
            core.info(`Cache hit occurred on the primary key ${primaryKey}, not saving cache.`);
            return;
        }

        const cachePaths = utils.getInputAsArray(Inputs.Path, { required: true });
        const cacheDirectory = "/caching"; // Replace with your actual PVC mount path
        const tarballPath = path.join(cacheDirectory, `${primaryKey}.tar`);

        // Ensure the cache directory exists
        if (!fs.existsSync(cacheDirectory)) {
            fs.mkdirSync(cacheDirectory, { recursive: true });
        }

        await tar.create(
            {
                gzip: true,
                file: tarballPath,
                cwd: process.cwd()
            },
            cachePaths
        );

        core.info(`Cache saved with key: ${primaryKey}`);
    } catch (error) {
        utils.logWarning((error as Error).message);
    }
}

export default saveImpl;