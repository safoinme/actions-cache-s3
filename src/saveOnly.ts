import * as core from "@actions/core";
import saveImpl from "./saveImpl";
import { NullStateProvider } from "./stateProvider";

async function run(): Promise<void> {
    try {
        await saveImpl(new NullStateProvider());
        // If saveImpl succeeds, you can log a success message or simply proceed
    } catch (error) {
        // If saveImpl throws an error, log a warning
        if (error instanceof Error) {
            core.warning(error.message);
        } else {
            core.warning('Cache save failed with an unknown error.');
        }
    }
}

run();

export default run;