# Nkt-plugins-functions
List of Azure functions to manage [Nkt-plugins](https://github.com/fabienDaou/Nkt-plugins).

## Deploying plugins from Nkt
Use PluginV2 plugin command in Nkt chat to post a request to Azure function (see commit function). It will checkout the repository and commit the changes if they are valid. Then the deploy Github action in [Nkt-plugins](https://github.com/fabienDaou/Nkt-plugins) will take over to update Nkt chat with the new version of the plugin.

## Accessing plugins code from Nkt
Because Nkt loads plugins from a private and public repository as well as because Nkt does not support OAuth (to use people own credentials), I created a proxy azure function, to load plugins from both repository. Also azure is not free so I aggregate plugins with Github Graphql api.

Request looks like:
GET https://azureApp/getAll

And response looks like
```json
[
  {
    "name": "repoName",
    "isPrivate": false,
    "plugins": [
      {
        "name": "pluginName.js",
        "text": "$.plugin({...});"
      }
    ]
  },
  {
    "name": "repoName",
    "isPrivate": true,
    "plugins": [
      {
        "name": "pluginName.js",
        "text": "$.plugin({...});\n"
      }
    ]
  }
]
```

## Test Github Graphql api
Nice testing tool, Github Graphql explorer: https://developer.github.com/v4/explorer/