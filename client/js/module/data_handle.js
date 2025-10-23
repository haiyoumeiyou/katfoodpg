const datamanipulator = {}

datamanipulator.txtToJson=(txt_data) => {
    let all_lines = txt_data.split(/\r\n|\n/);
    let headers = all_lines[0].split(/\t|,/);
    let json_data = [];

    for(let i=1; i<all_lines.length; i++){
        let line = all_lines[i].split(/\t|,/);
        let row = {};

        if(line.length == headers.length){
            for(let j=0; j<headers.length; j++){
                if (line[j].length > 0) {
                    row[headers[j]] = line[j];
                    json_data.push(row);
                }
            }
        }
    }
    return json_data;
}

datamanipulator.groupArrayToDictByKeyField = (source_data, group_key, data_key, val_key) => {
    let group_data = {};
    if (source_data.length > 0) {
        source_data.forEach(row=>{
            if (row[group_key] in group_data) {
                group_data[row[group_key]].grouped_data[row[data_key]] = row[val_key];
            } else {
                group_data[row[group_key]] = row;
                group_data[row[group_key]].grouped_data = {};
                group_data[row[group_key]].grouped_data[row[data_key]] = row[val_key];
                delete group_data[row[group_key]][data_key];
                delete group_data[row[group_key]][val_key];
            }
        })
    }
    return group_data;
}

const math = {};

math.equals = (p1,p2) => {
    return p1[0]==p2[0]&&p1[1]==p2[1];
}
math.lerp = (a,b,t) => {
    return a+(b-a)*t;
}
math.invLerp = (a,b,v) => {
    return (v-a)/(b-a);
}
math.remap = (oldA,oldB,newA,newB,v) => {
    return math.lerp(newA,newB,math.invLerp(oldA,oldB,v));
}
math.remapPoint = (oldBounds,newBounds,point) => {
    return [
        math.remap(oldBounds.left,oldBounds.right,newBounds.left,newBounds.right,point[0]),
        math.remap(oldBounds.top,oldBounds.bottom,newBounds.top,newBounds.bottom,point[1])
    ];
}
math.add = (p1,p2) => {
    return [p1[0]+p2[0], p1[1]+p2[1]];
}
math.subtract = (p1,p2) => {
    return [p1[0]-p1[0], p1[1]-p2[1]];
}
math.scale = (p,scaler) => {
    return [p[0]*scaler, p[1]*scaler];
}
math.distance = (p1,p2) => {
    return Math.sqrt((p1[0]-p2[0])**2+(p1[1]-p2[1])**2);
}
math.formatNumber = (n,dec=0) => {
    return n.toFixed(dec);
}
math.getNearest = (loc,points) => {
    let minDist = Number.MAX_SAFE_INTEGER;
    let nearestIndex = 0;

    for (let i=0;i<points.length;i++) {
        const point = points[i];
        const d = math.distance(loc,point);

        if (d<minDist) {
            minDist = d;
            nearestIndex = i;
        }
    }
    return nearestIndex;
}

export { datamanipulator, math }