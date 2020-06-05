const jshint = require("jshint").JSHINT;
const { exec } = require("child_process");
const fs = require("fs").promises;
const fsExtra = require("fs-extra");
const { log } = require("../shared/logger");
const { validateNamePattern, validateNameLength, validateContentType, validateBodyNotEmpty, executeValidators, validateAccessTokenExistence } = require("../shared/validators");

const NKTPLUGINS_REPO_PATH = "D:\\local\\Temp";

module.exports = async function (context, req) {
    const validators = [
        validateNamePattern, 
        validateNameLength, 
        req => validateContentType(req, "application/javascript"), 
        validateBodyNotEmpty,
        validateAccessTokenExistence];
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

    log(context, "Validating plugin code...");

    const { body } = req;
    jshint(body, { esversion: 6 });
    if (jshint.errors && jshint.errors.length === 0) {

        const { name, accessToken } = req.query;

        log(context, "Plugin code validated.");

        await cloneGitRepository(getRepositoryNameUpdated(req, context), accessToken);

        log(context, "Repository cloned.");

        await updatePluginFileContent(name, body, context);

        log(context, "Plugin file updated.");

        await commitAndPushUpdate(name);

        log(context, "Plugin commited and pushed.");

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

    log(context, "Checking existence of file " + filePath);

    if (await fsExtra.pathExists(filePath)) {
        log(context, `${filePath} exists, removing it...`);

        await fs.unlink(filePath);

        log(context, `${filePath} removed.`);
    }

    log(context, `Writing to ${filePath}...`);

    await fsExtra.ensureFile(filePath);

    await fs.writeFile(filePath, content);

    log(context, "Writing operation done.");
};

const cloneGitRepository = async (repositoryName, accessToken) => {
    // ensures there is no lingering repository
    await fsExtra.remove(NKTPLUGINS_REPO_PATH + "\\nktPlugins");

    await executeCommand(`git clone -b master https://${accessToken}@github.com/fabienDaou/${repositoryName}.git ${NKTPLUGINS_REPO_PATH}\\nktPlugins --depth=1`);
};

const getRepositoryNameUpdated = (request, context) => {
    const { isPrivate: isPrivateAsString } = request.query;

    const isPrivate = isPrivateAsString === "true";
    const repositoryToUpdate = isPrivate ?
        process.env.PrivateRepositoryName :
        process.env.PublicRepositoryName;

    log(context, `Plugin is going to be commited on ${isPrivate ? "private" : "public"} repository.`);
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