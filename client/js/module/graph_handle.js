class GraphHandle {
    // constructor(container) {
    //     this.ui_area = container;
    //     if (this.ui_area) {
    //         this.ui_area.innerHTML = '';
    //     }
    //     // console.log(container);
    // }
    
    // createCanvas() {
    //     const c = document.createElement('canvas');
        
    //     return c;
    // }

    // drawCircle(c) {
    //     const ctx = c.getContext("2d");
    //     ctx.beginPath();
    //     ctx.arc(95, 50, 40, 0, 2 * Math.PI);
    //     ctx.stroke();
    // }

    // drawBarChart(c, x, y, width, height, data) {
    //     console.log(x, y, width, height);
    //     if (c.getContext) {
    //         const ctx = c.getContext("2d");

    //         ctx.fillStyle = color;
    //         ctx.fillRect(x, y, width, height);
    //         ctx.font = "24px serif";
    //         // ctx.textBaseline = "buttom";
    //         ctx.textAlign = "start";
    //         ctx.fillStyle = "white";
    //         ctx.fillText("number", x+1, height/3);
    //     }
    // }
    static drawLine(ctx,startX,startY,endX,endY,color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(startX,startY);
        ctx.lineTo(endX,endY);
        ctx.stroke();
        ctx.restore();
        // console.log(startX,startY,endX,endY,color);
    }
    static drawBar(ctx,upperLeftX,upperLeftY,width,height,color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(upperLeftX,upperLeftY,width,height);
        ctx.restore();
    }
    static calcCanvasSize(container=self, layout={columns:3,rows:3,scale:1,ratio:0.6}) {
        const container_size = container.getBoundingClientRect();

        const width = Math.floor((container_size.width / layout.columns)*layout.scale);
        const height = Math.floor(width*layout.ratio);
        return {width:width, height:height}
    }
}

const graphics = {};

graphics.drawPoint = (ctx,loc,color="black",size=8) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(...loc,size/2,0,Math.PI*2);
    ctx.fill();
}
graphics.drawText = (ctx,{text,loc,align="center",vAlign="middle",size=10,color="black"}) => {
    ctx.textAlign = align;
    ctx.textBaseline = vAlign;
    ctx.font = "bold "+size+"px Courier";
    ctx.fillStyle = color;
    ctx.fillText(text, ...loc);
}
graphics.generateImage = (styles,size=20) => {
    for (let label in styles) {
        const style = styles[label];
        const canvas = document.createElement("canvas");
        canvas.width = size+10;
        canvas.height = size+10;

        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = size+"px Courier";

        const colorHueMap = {
            red:0,
            yellow:60,
            green:120,
            cyan:180,
            blue:240,
            magenta:300
        };
        const hue = -45+colorHueMap[style.color];
        if (!isNaN(hue)) {
            ctx.filter = `
                brightness(2)
                contrast(0.3)
                sepia(1)
                brightness(0.7)
                hue-rotate(${hue}deg)
                saturate(3)
                contrast(3)
            `;
        } else {
            ctx.filter = "grayscale(1)";
        }

        ctx.fillText(style.text,canvas.width/2,canvas.height/2);

        style["image"] = new Image();
        style["image"].src = canvas.toDataURL();
    }
}
graphics.drawImage = (ctx,image,loc) => {
    ctx.beginPath();
    ctx.drawImage(image,loc[0]-image.width/2,loc[1]-image.height/2,image.width,image.height);
    ctx.fill();
}

export { GraphHandle, graphics }