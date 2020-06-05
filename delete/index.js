const { exec } = require("child_process");
const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const { log } = require("../shared/logger");
const { validateNamePattern, validateAccessTokenExistence, executeValidators } = require("../shared/validators");

const NKTPLUGINS_REPO_PATH = "D:\\local\\Temp";

module.exports = async function (context, req) {
    const validators = [validateNamePattern, validateAccessTokenExistence];
    const validationErrors = executeValidators(req, validators);
    if (validationErrors.length > 0) {
        const aggregatedValidationErrors = validationErrors.join("\n");
        log(context, `Some validations failed:${aggregatedValidationErrors}`);
        context.res = {
            status: 400,
            body: aggregatedValidationErrors
        };
        return;
    }

    const { name, accessToken, isPrivate: isPrivateAsString } = req.query;
    await cloneGitRepository(getRepositoryNameUpdated(isPrivateAsString === "true", context), accessToken);

    log(context, "Repository cloned.");

    const success = await tryDeletePlugin(name, context);

    if (success) {
        await commitAndPushUpdate(name);

        log(context, "Plugin deleted and pushed.");

        context.res = {
            status: 200
        };
    } else {
        context.res = {
            status: 404
        };
    }
};

const commitAndPushUpdate = async name => {
    const options = { cwd: `${NKTPLUGINS_REPO_PATH}\\nktPlugins`, timeout: 10000 };
    await executeCommand("git config user.name \"deleteFunction\"", options);
    await executeCommand("git config user.email \"none@none.com\"", options);
    await executeCommand("git add -A", options);
    await executeCommand(`git commit -m "Plugin ${name} deleted."`, options);
    await executeCommand("git push", options);
};

const tryDeletePlugin = async (name, context) => {
    const filePath = `${NKTPLUGINS_REPO_PATH}\\nktPlugins\\plugins\\${name}.js`;

    log(context, "Checking existence of file " + filePath);

    if (await fsExtra.pathExists(filePath)) {
        log(context, `${filePath} exists, removing it...`);

        await fs.unlink(filePath);

        return true;
    } else {
        log(context, `Plugin does not exist at ${filePath}.`);
        return false;
    }
};

const cloneGitRepository = async (repositoryName, accessToken) => {
    // ensures there is no lingering repository
    await fsExtra.remove(`${NKTPLUGINS_REPO_PATH}\\nktPlugins`);

    await executeCommand(`git clone -b master https://${accessToken}@github.com/fabienDaou/${repositoryName}.git ${NKTPLUGINS_REPO_PATH}\\nktPlugins --depth=1`);
};

const getRepositoryNameUpdated = (isPrivate, context) => {
    const repositoryToUpdate = isPrivate ?
        process.env.PrivateRepositoryName :
        process.env.PublicRepositoryName;

    log(context, `Plugin is going to be deleted in ${isPrivate ? "private" : "public"} repository.`);
    return repositoryToUpdate;
};

const executeCommand = async (command, options) => {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            }
            resolve();
        });
    });
};