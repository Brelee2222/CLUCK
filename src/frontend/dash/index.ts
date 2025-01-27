import { getApiEndpoint } from "../../consts";
import type { LoggedIn, Member } from "../../types";
import { MemberCircle, placeCircles, setAspectRatio } from "./circlePacker";
import { redrawCircles, getRatio } from "./renderCircles";
import { refreshDelphi, setDelphiVisibility } from "./chiefdelphi"
import { openFullscreen } from "../util";

let members: Member[]
let loggedInCache: LoggedIn;

window["openFullscreen"] = openFullscreen

refreshDelphi()
setInterval(refreshDelphi, 1000 * 60 * 2) // refresh post every 1 minute

function regenCircles(loggedin: LoggedIn) {
    let placedCircles: MemberCircle[] = [];

    const circles = []
    const now = Date.now()
    for(const ent in loggedin) {
        const member = members.find(o => o.name == ent)
        circles.push(new MemberCircle(
            (now - loggedin[ent]) / 360000, // 1000 / 60 / 60
            member.firstname,
            member.img
        ))
    }

    setDelphiVisibility(getNameDensity(circles) < 1)

    setAspectRatio(getRatio());
    placedCircles = placeCircles(circles);
    redrawCircles(placedCircles)
}

const densityMultiplier = 0.006;
// Estimates name density
function getNameDensity(circles : MemberCircle[]) {
    let nameSize = 0;
    let circleSizeSum = 0;
    let circleSizeSumSqr = 0;
    for(const circle of circles) {
        nameSize += circle.name.length * densityMultiplier + 2;
        circleSizeSumSqr += Math.pow(circle.r, 2);
        circleSizeSum += circle.r;
    }

    return densityMultiplier * nameSize / Math.sqrt(circleSizeSumSqr / circleSizeSum / circles.length);
}

function update() {
    fetch(getApiEndpoint('loggedin')).then(res => res.json().then(loggedin => {
        // return if there's no change
        if (JSON.stringify(loggedInCache) == JSON.stringify(loggedin)) { return }
        loggedInCache = loggedin
        regenCircles(loggedin)
    }));
}

async function start() {
    members = await (await fetch(getApiEndpoint("members"))).json()
    loggedInCache = {}

    update()

    setInterval(() => {
        regenCircles(loggedInCache)
    }, 1000 * 60);
    setInterval(() => {
        update()
    }, 1000 * 3);

}

start()