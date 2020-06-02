const jshint = require("jshint").JSHINT;
const { exec } = require("child_process");
const fs = require("fs").promises;
const fsExtra = require("fs-extra");

const NKTPLUGINS_REPO_PATH = "D:\\local\\Temp";

module.exports = async function (context, req) {
    const validators = [validateNamePattern, validateNameLength, validateContentType, validateBodyNotEmpty];

    const validationResults = validators.map(validator => validator(req));
    const validationErrorResults = validationResults.filter(validationResult => validationResult.result === false);
    const validationErrors = validationErrorResults.map(result => result.error);

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
    const filePath = NKTPLUGINS_REPO_PATH + "\\nktPlugins\\plugins\\" + name + ".js";

    context.log("Checking existence of file " + filePath);

    if (await fsExtra.pathExists(filePath)) {
        context.log(filePath + " exists, removing it...");

        await fs.unlink(filePath);

        context.log(filePath + " removed.");
    }

    context.log("Writing to " + filePath + "...");

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

const validateBodyNotEmpty = request => {
    return request.body ?
        { result: true } :
        {
            result: false,
            error: "Must pass a body in the request."
        };
};

const validateContentType = request => {
    return request.headers["content-type"] === "application/javascript" ?
        { result: true } :
        {
            result: false,
            error: "ContentType should be application/javascript."
        };
};

const validateNamePattern = request => {
    const lettersAndNumbers = /^[0-9a-zA-Z]+$/;
    return request.query.name && request.query.name.match(lettersAndNumbers) ?
        { result: true } :
        {
            result: false,
            error: "Must pass a valid name, only not empty names and a-z, A-Z and 0-9 characters are allowed."
        };
};

const validateNameLength = request => {
    const minNameLength = 2;
    const maxNameLength = 25;
    return request.query.name && request.query.name.length >= minNameLength && request.query.name.length <= maxNameLength ?
        { result: true } :
        {
            result: false,
            error: `Length of plugin name must be in range [${minNameLength}, ${maxNameLength}].`
        };
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