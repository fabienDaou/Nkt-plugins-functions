const jshint = require("jshint").JSHINT;
const { exec } = require("child_process");
const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const { validateNamePattern, validateNameLength, validateContentType, validateBodyNotEmpty, executeValidators } = require("../shared/validators.js");

const NKTPLUGINS_REPO_PATH = "D:\\local\\Temp";

module.exports = async function (context, req) {
    const validators = [validateNamePattern, validateNameLength, req => validateContentType(req, "application/javascript"), validateBodyNotEmpty];
    const validationErrors = executeValidators(req, validators);
    if (validationErrors.length > 0) {
        const aggregatedValidationErrors = validationErrors.join("\n");
        context.log(`Some validations failed:${aggregatedValidationErrors}`);
        context.res = {
            status: 400,
            body: aggregatedValidationErrors
        };
        return;
    }

    context.log("Validating plugin code...");

    const { body } = req;
    jshint(body, { esversion: 6 });
    if (jshint.errors && jshint.errors.length === 0) {

        context.log("Plugin code validated.");

        await cloneGitRepository(getRepositoryNameUpdated(req, context));

        context.log("Repository cloned.");

        const { name } = req.query;
        await updatePluginFileContent(name, body, context);

        context.log("Plugin file updated.");

        await commitAndPushUpdate(name);

        context.log("Plugin commited and pushed.");

        context.res = {
            status: 200
        };
    } else {
        context.res = {
            status: 400,
            body: jshint.errors
        };
    }
};

const commitAndPushUpdate = async name => {
    const options = { cwd: NKTPLUGINS_REPO_PATH + "\\nktPlugins", timeout: 10000 };
    await executeCommand("git config user.name \"commitFunction\"", options);
    await executeCommand("git config user.email \"none@none.com\"", options);
    await executeCommand("git add -A", options);
    await executeCommand("git commit -m \"Plugin " + name + " updated.\"", options);
    await executeCommand("git push", options);
};

const updatePluginFileContent = async (name, content, context) => {
    const filePath = `${NKTPLUGINS_REPO_PATH}\\nktPlugins\\plugins\\${name}.js`;

    context.log("Checking existence of file " + filePath);

    if (await fsExtra.pathExists(filePath)) {
        context.log(`${filePath} exists, removing it...`);

        await fs.unlink(filePath);

        context.log(`${filePath} removed.`);
    }

    context.log(`Writing to ${filePath}...`);

    await fsExtra.ensureFile(filePath);

    await fs.writeFile(filePath, content);

    context.log("Writing operation done.");
};

const cloneGitRepository = async (repositoryName) => {
    const userEnv = process.env.NktPluginsUserName;
    const personalAccessTokenEnv = process.env.NktPluginsPersonalAccessToken;
    const credentials = userEnv + ":" + personalAccessTokenEnv;

    // ensures there is no lingering repository
    await fsExtra.remove(NKTPLUGINS_REPO_PATH + "\\nktPlugins");

    await executeCommand(`git clone -b master https://${credentials}@github.com/fabienDaou/${repositoryName}.git ${NKTPLUGINS_REPO_PATH}\\nktPlugins --depth=1`);
};

const getRepositoryNameUpdated = (request, context) => {
    const { isPrivate: isPrivateAsString } = request.query;

    const isPrivate = isPrivateAsString === "true";
    const repositoryToUpdate = isPrivate ?
        process.env.PrivateRepositoryName :
        process.env.PublicRepositoryName;

    context.log(`Plugin is going to be commited on ${isPrivate ? "private" : "public"} repository.`);
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