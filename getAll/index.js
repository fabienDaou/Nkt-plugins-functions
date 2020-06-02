const got = require("got");
const { log } = require("../shared/logger");

module.exports = async function (context, req) {
    const accessToken = process.env.NktPluginsPersonalAccessToken;
    const graphqlGithub = `https://${accessToken}@api.github.com/graphql`;
    const { statusCode, body } = await got.post(graphqlGithub, {
        json: {
            query: "query GetPlugins { search(first: 3, query: \"Nkt-plugins\", type: REPOSITORY) { edges { node { ... on Repository { name isPrivate object(expression: \"master:plugins\") { ... on Tree { entries { name object { ... on Tree { entries { name } } ... on Blob { text } } } } } } } } } }"
        }
    });

    log(context, "Fetch successful.")

    if (statusCode === 200) {
        const { data } = JSON.parse(body);
        const result = data.search.edges.filter(({ node }) => node.object !== null).map(({ node }) => {
            return {
                name: node.name,
                isPrivate: node.isPrivate,
                plugins: node.object.entries.map(({ name, object }) => {
                    return { name, text: object.text };
                })
            };
        });
        context.res = {
            status: 200,
            body: result,
            headers: {
                "Content-Type": "application/json;charset=utf-8"
            }
        };
    } else {
        context.res = {
            status: 400,
            body
        };
    }
};