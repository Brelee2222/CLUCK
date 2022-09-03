import cors from 'cors'
import fs from 'fs'
import { CronJob } from 'cron'
import { WebClient } from "@slack/web-api"
import { Express } from 'express'
import { addLabHoursSafe, configureDrive } from "./spreadsheet";
import { logMember, saveMemberLog } from "./memberlog";
import { failedFilePath, loggedInFilePath } from '../../consts'


let memberlist
let client: WebClient


export type FailedEntry = {
    name: string;
    timeIn: number;
    timeOut: number;
}
export type LoggedIn = {
    [key:string]:number
}


let loggedIn: LoggedIn = {}
if (fs.existsSync(loggedInFilePath)) { loggedIn = JSON.parse(fs.readFileSync(loggedInFilePath, "utf-8")) }

let failed: FailedEntry[] = []
if (fs.existsSync(failedFilePath)) { failed = JSON.parse(fs.readFileSync(failedFilePath, "utf-8")) }


configureDrive()


export async function sendSlackMessage(fullname: string, text: string) {
    if (memberlist == null) {
        console.warn("Memberlist not loaded yet")
        return
    }
    if (client == null) {
        console.warn("Slack Client not loaded yet")
        return
    }
    const user = memberlist.find(userobj => userobj.real_name?.toLowerCase().includes(fullname.toLowerCase()) ?? false)
    if (user == null || user.id == null) { throw Error("Could not send message to " + fullname) }
    console.log(`Sending message to ${user.id}`)
    return await client.chat.postMessage({ channel: user.id, text: text })

}

export async function refreshSlackMemberlist() {
    const users = await client.users.list()
    if (users.members == null) { console.warn("Could not load memberlist") }
    memberlist = users.members
}

export const setupApi = async (app: Express, slack_client: WebClient) => {
    app.use(cors())
    
    // INIT SLACKBOT
    client = slack_client
    
    refreshSlackMemberlist()
    // INIT API ROUTES
    app.get('/clock/', (req, res) => {
        // Get and check args
        const name = req.query.name as string
        const loggingin = req.query.loggingin
        // Check for existing request arguments
        if (!name || !loggingin) { res.status(400).send('Must include name string and loggingin boolean in URL query').end(); return; }
        
        if (loggingin === 'true') {
            // Log In
            if (!loggedIn[name]) { loggedIn[name] = Date.now() }
            res.end()
            logMember(name, true, loggedIn)
        } else {
            // Log Out
            if (loggedIn[name]) { // Test to make sure person is logged in
                res.end()
                console.log(`Logging out ${name}`)
                addLabHoursSafe(name, failed, loggedIn[name])
                delete loggedIn[name]
                logMember(name, false, loggedIn)
                
            } else { res.end() }
        }
    })
    
    app.get('/void', (req, res) => {
        delete loggedIn[req.query.name as string];
        res.end()
    })
    app.get('/loggedin', (req, res) => {
        res.send(loggedIn)
        res.end()
    })
    app.get('/ping', (req, res) => {
        res.status(200);
        res.send("pong");
    })
    
    // Read log
    
    return app;
}


// Periodically save
const cronSave = () => {
    try {
        fs.writeFileSync(loggedInFilePath, JSON.stringify(loggedIn))
        fs.writeFileSync(failedFilePath, JSON.stringify(failed))
        saveMemberLog()
    } catch (error) { console.log(error) }
}

new CronJob({
    cronTime: '*/5 * * * * *',
    start: true,
    timeZone: 'America/Los_Angeles',
    runOnInit: false,
    onTick: cronSave
})

// Periodically retry failed requests every 15 minutes and on startup
const cronRetryFailed = async () => {
    const failedCache = failed;
    failed = []
    for (const failedLog of failedCache) {
        console.log(`attempting to log ${failedLog.timeIn} to ${failedLog.timeOut} hours for ${failedLog.name}`)
        await addLabHoursSafe(failedLog.name, failed, failedLog.timeIn, failedLog.timeOut)
    }
}
new CronJob({
    cronTime: '*/15 * * * *',
    start: true,
    timeZone: 'America/Los_Angeles',
    runOnInit: true,
    onTick: cronRetryFailed
})

// sign out at midnight
const cronSignout = () => {
    const messageUsers = Object.keys(loggedIn)
    loggedIn = {}
    console.log('hiiii')
    messageUsers.forEach(async (memberName) => {
        console.log(memberName)
        try {
            await sendSlackMessage(memberName, `Hey ${memberName.split(' ')[0]}! You signed into the lab today but forgot to sign out, so we didnt log your hours for today :( Make sure you always sign out before you leave. Hope you had fun and excited to see you in the lab again!`)
        } catch (error) {
            console.error(error)
        }
    })
}
new CronJob({
    cronTime: '0 0 * * *',
    start: true,
    timeZone: 'America/Los_Angeles',
    runOnInit: false,
    onTick: cronSignout
})

// refresh memberlist every day
new CronJob({
    cronTime: '0 0 * * *',
    start: true,
    timeZone: 'America/Los_Angeles',
    runOnInit: false,
    onTick: refreshSlackMemberlist
})

export const cronJobs = {
    "save":cronSave,
    "retryFailed":cronRetryFailed,
    "signout":cronSignout
}

export function accessFailed(newValue?:FailedEntry[]) { 
    failed = newValue ?? failed
    return failed 
}
export function accessLoggedIn(newValue?:LoggedIn) { 
    loggedIn = newValue ?? loggedIn
    return loggedIn 
}