const createApp = require('github-app');
const createWebhook = require('github-webhook-handler')
const Discord = require("discord.js");
const discordApp = new Discord.Client();
const http = require("http")
const theApp = {};
theApp.votes = {};
var APPID = "";
var PRQC = "";
var DEBUGC = "";
async function main() {
await discordApp.login("TOKEN")
const app = createApp({
  // Your app id
  id: APPID,
  // The private key for your app, which can be downloaded from the
  // app's settings: https://github.com/settings/apps
  cert: require('fs').readFileSync('priv.pem')
});

app.asApp().then(github => {
  console.log("Installations:")
  github.apps.getInstallations({}).then(installs => {discordApp.channels.get(DEBUGC).send("Installations: ```" + JSON.stringify(installs) + "```")});
});
const webhook = createWebhook({
  path: '/',
  secret: 'SandyIsACoolCat'
})
const server = http.createServer((req, res) => {
  webhook(req, res, err => {
    if (err) {
      console.error(err)
      res.statusCode = 500
      res.end('Something has gone terribly wrong.')
    } else {
      res.statusCode = 404
      res.end('no such location')
    }
  })
})
server.listen(25567)
webhook.on('pull_request', async event => {
  if (event.payload.action === 'opened') {
    console.log(JSON.stringify(event));
    app.asInstallation(event.payload.installation.id).then(async github => {
     github.repos.createStatus({
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        sha: event.payload.pull_request.head.sha, state: "pending", target_url: "http://home.sascha-t.de/", description: "The Community will now vote on this Pull Request!", context: "Community Vote!"
      })
      console.log(JSON.stringify(event.payload));
      var message = await discordApp.channels.get(PRQC).send("[PRQ] " + event.payload.pull_request.title + " VOTE! (5 Min remaining)")
      await message.react("❎");
      await message.react("✅");
      theApp.votes[message.id] = {}
      theApp.votes[message.id]["event"] = event;
      theApp.votes[message.id]["sha"] = event.payload.pull_request.head.sha;
      theApp.votes[message.id]["title"] = event.payload.pull_request.title;
      theApp.votes[message.id]["disc"] = "[PRQ] " + event.payload.pull_request.title + " VOTE!";
      theApp.votes[message.id]["time"] = 3;
      setTimeout(decreaseTimer, 1000, message.id, app)
    })
  }
})
}
async function decreaseTimer(msgid, appX) {
if(theApp.votes[msgid]["time"] >= 1) {
  theApp.votes[msgid]["time"] = theApp.votes[msgid]["time"] - 1;
  discordApp.channels.get(PRQC).messages.get(msgid).edit(theApp.votes[msgid]["disc"] + " (" + theApp.votes[msgid]["time"] + " Min remaining)" )
  setTimeout(decreaseTimer, 2000, msgid, appX)
} else {
  var accepted = false;
  var yes = await discordApp.channels.get(PRQC).messages.get(msgid).reactions.find(reaction => reaction.emoji.name === '✅').count - 1
  var no = await discordApp.channels.get(PRQC).messages.get(msgid).reactions.find(reaction => reaction.emoji.name === '❎').count - 1
  if(yes > no) {
    accepted = true;
  }
  console.log(`Yes: ${yes}, No: ${no}, Accepted: ${accepted}`)
  var event = theApp.votes[msgid]["event"];
  var textX;
  if(accepted) {
    textX = "accepted";
  } else {
    textX = "denied";
  }
  await discordApp.channels.get(PRQC).messages.get(msgid).edit(theApp.votes[msgid]["disc"] + " has been " + textX)

  appX.asInstallation(event.payload.installation.id).then(async github => {
  if(accepted) {
    github.repos.createStatus({
      owner: event.payload.repository.owner.login,
      repo: event.payload.repository.name,
      sha: event.payload.pull_request.head.sha, state: "success", target_url: "http://home.sascha-t.de/", description: "The Community has accepted this pull request", context: "Community Vote!"
   })
  } else if(!accepted) {
    github.repos.createStatus({
      owner: event.payload.repository.owner.login,
      repo: event.payload.repository.name,
      sha: event.payload.pull_request.head.sha, state: "failure", target_url: "http://home.sascha-t.de/", description: "The Community has denied this pull request", context: "Community Vote!"
   })
  }
})
  
}
}

main();