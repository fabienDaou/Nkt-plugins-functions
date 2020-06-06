const got = require("got");

module.exports = async function (context, req) {
    const { code } = req.query;
    if (code) {
        const clientId = process.env.GithubNktClientId;
        const clientSecret = process.env.GithubNktClientSecret;
        const url = `https://github.com/login/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;
        const { body } = await got.get(url, { headers: { "Accept": "application/json" } });
        context.res = {
            status: 200,
            body: body
        };
    } else {
        context.res = {
            status: 400,
            body: "Please provide the code from Guthub."
        };
    }
};