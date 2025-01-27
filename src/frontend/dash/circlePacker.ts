// note: circle radii are normalized on render
//const MARGIN = .14
const MARGIN = 1.3;
let aspectRatio = 1; // 2:1
let deltaAvg = 0.95; // How much effect the avgeraging has on the circles

let placedCircles: MemberCircle[] = []
let maxX;
let minX;
let maxY;
let minY;

let targetMaxX;
let targetMaxY;
let targetMinX;
let targetMinY;

export function getBounds() {
    return {
        maxX,
        maxY,
        minX,
        minY
    }
}

export class MemberCircle {
    x: number;
    y: number;
    r: number;
    // touching: MemberCircle[] = [];
    name: string;
    imgurl: string;
    constructor(hours, name, imgurl) {
        this.name = name;
        this.imgurl = imgurl;
        this.r = (Math.sqrt(hours + .2)) * 10;
    }
}

export function setAspectRatio(ratio : number) {
    aspectRatio = ratio;
}

function getDistanceFrom(circle1, x, y) {
    return Math.sqrt(Math.pow(circle1.x - x, 2) + Math.pow(circle1.y - y, 2));
}

function placeCircle(circle) {
    // TODO: remove from placeCircle and onto placeCircles
    
    if(!placedCircles.length) {
        circle.x = circle.y = 0;
        return;
    }

    if(placedCircles.length == 1) {
        // circle.touching[circle.touching.length] = placedCircles[0].r, but stupider
        //^^^what's the deal with the length being an index here?^^^ -- thing[thing.length] is append to the last index

        const distance = Math.pow(MARGIN + placedCircles[0].r + circle.r, 2);

        const rand = Math.random();

        circle.x = Math.round(Math.random()) ? Math.sqrt(rand * distance) : -Math.sqrt(rand * distance);
        circle.y = Math.round(Math.random()) ? Math.sqrt((1 - rand) * distance) : -Math.sqrt((1 - rand) * distance);
        return;
    }
    
    for(let index1 = 0; index1 != placedCircles.length; index1++) {
        const circle1 = placedCircles[index1];
        for(let index2 = index1+1; index2 != placedCircles.length; index2++) {
            const circle2 = placedCircles[index2];
            const distanceFrom = circle1.r + circle2.r + MARGIN; 

            const radius1 = circle1.r + circle.r + MARGIN;
            const radius2 = circle2.r + circle.r + MARGIN;

            // a : distance from fulcrum
            const a = (radius1*radius1 - radius2*radius2 + distanceFrom*distanceFrom)/(2*distanceFrom);

            // dx : delta X
            const dx = circle1.x-circle2.x;
            const dy = circle1.y-circle2.y;

            // p : slope for perpendicular bisector of circle1 and circle2
            const p = -dx/dy;

            //
            const multiplier = a/distanceFrom;

            let posX = circle1.x - multiplier * dx;
            let posY = circle1.y - multiplier * dy;

            let circleX = posX + Math.sqrt(radius1*radius1 - a*a)/Math.sqrt(1 + p*p);
            let circleY = posY + p * Math.sqrt(radius1*radius1 - a*a)/Math.sqrt(1 + p*p);

            if(isVacant(circle, circleX, circleY)) {
                circle.x = circleX;
                circle.y = circleY;
                // circle1.touching[circle1.touching.length] = circle;
                if(targetMaxX > circle.x + circle.r && targetMaxY > circle.y + circle.r  && targetMinX < circle.x - circle.r && targetMinY < circle.y - circle.r){
                    return;
                }
                    
            }

            // console.log(a)
            // console.log(p)
            // console.log(radius1)
            // console.log(radius2)

            // improvements?
            circleX = posX - Math.sqrt(radius1*radius1 - a*a)/Math.sqrt(1 + p*p);
            circleY = posY - p * Math.sqrt(radius1*radius1 - a*a)/Math.sqrt(1 + p*p);

            if(isVacant(circle, circleX, circleY)) {
                circle.x = circleX;
                circle.y = circleY;
                if(targetMaxX > circle.x + circle.r && targetMaxY > circle.y + circle.r  && targetMinX < circle.x - circle.r && targetMinY < circle.y - circle.r) {
                    return;
                }
            }
        }
    }
}

function isVacant(circle, x, y) {
    for(let circle1 of placedCircles) {
        // I'm afraid of inccuracies
        if(getDistanceFrom(circle1, x, y) + 0.00001 < circle.r + circle1.r + MARGIN)
            return false;
            
    }
    return true;
}

// const sizeMin = 1;
// const sizeMax = 30;

// function clampSize(value) {
//     return Math.max(sizeMin, Math.min(sizeMax, value));
// }

// assumes unplacedCircles is EMPTY
// and placedCircles is FILLED
export function placeCircles(circles: MemberCircle[]) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
    targetMaxX = 0;
    targetMaxY = 0;
    targetMinX = 0;
    targetMinY = 0;
    // normalize
    placedCircles = [];
    const unplacedCircles = circles.sort((a, b) => b.r - a.r);

    let sizeSum = 0;

    for(let circle = unplacedCircles.shift(); circle; circle = unplacedCircles.shift()) {
        // circle.x = circle.y = 0;
        // circle.r = clampSize(circle.r);
        circle.r -= (circle.r - (sizeSum += circle.r)/(placedCircles.length+1)) * deltaAvg;
        placeCircle(circle);
        placedCircles[placedCircles.length] = circle;
        // console.log(circle.x);
        // console.log(circle.y);
        // console.log(circle.r);
        let targetMaxX1 = maxX = Math.max(maxX, circle.x + circle.r);
        let targetMaxY1 = maxY = Math.max(maxY, circle.y + circle.r);
        let targetMinX1 =  minX = Math.min(minX, circle.x - circle.r);
        let targetMinY1 = minY = Math.min(minY, circle.y - circle.r);

        targetMaxX = Math.max(targetMaxX1, targetMaxY1*aspectRatio);
        targetMaxY = Math.max(targetMaxY1, targetMaxX1/aspectRatio);
        targetMinX = Math.min(targetMinX1, targetMinY1*aspectRatio);
        targetMinY = Math.min(targetMinY1, targetMinX1/aspectRatio);
    }

    

    return placedCircles;
}

