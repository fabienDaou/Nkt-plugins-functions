exports.executeValidators = (request, validators) => {
    const validationResults = validators.map(validator => validator(request));
    const validationErrorResults = validationResults.filter(validationResult => validationResult.result === false);
    return validationErrorResults.map(result => result.error);
};

exports.validateAccessTokenExistence = request => {
    return request.query.accessToken ?
        { result: true } :
        {
            result: false,
            error: "Must pass a github access token."
        };
};

// Main goal is to prevent path traversal as the name will be used in commands.
exports.validateNamePattern = request => {
    const lettersAndNumbers = /^[0-9a-zA-Z]+$/;
    return request.query.name && request.query.name.match(lettersAndNumbers) ?
        { result: true } :
        {
            result: false,
            error: "Must pass a valid name, only not empty names and a-z, A-Z and 0-9 characters are allowed."
        };
};

exports.validateNameLength = request => {
    const minNameLength = 2;
    const maxNameLength = 25;
    return request.query.name && request.query.name.length >= minNameLength && request.query.name.length <= maxNameLength ?
        { result: true } :
        {
            result: false,
            error: `Length of plugin name must be in range [${minNameLength}, ${maxNameLength}].`
        };
};

exports.validateContentType = (request, expected) => {
    return request.headers["content-type"] === expected ?
        { result: true } :
        {
            result: false,
            error: `ContentType should be ${expected}`
        };
};
exports.validateBodyNotEmpty = request => {
    return request.body ?
        { result: true } :
        {
            result: false,
            error: "Must pass a body in the request."
        };
};