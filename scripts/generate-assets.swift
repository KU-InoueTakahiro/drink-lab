import AppKit
let destination = URL(fileURLWithPath: CommandLine.arguments[1])
func color(_ hex:String)->NSColor { let n=UInt32(hex,radix:16)!; return NSColor(srgbRed:CGFloat((n>>16)&255)/255,green:CGFloat((n>>8)&255)/255,blue:CGFloat(n&255)/255,alpha:1) }
func render(_ w:Int,_ h:Int,_ file:String,_ draw:()->Void){
 let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:w,pixelsHigh:h,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 let context=NSGraphicsContext(bitmapImageRep:rep)!;NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=context
 context.cgContext.translateBy(x:0,y:CGFloat(h));context.cgContext.scaleBy(x:1,y:-1)
 NSGraphicsContext.current=NSGraphicsContext(cgContext:context.cgContext,flipped:true)
 draw();NSGraphicsContext.restoreGraphicsState()
 try! rep.representation(using:.png,properties:[:])!.write(to:destination.appendingPathComponent(file))
}
func rect(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ r:CGFloat,_ hex:String){color(hex).setFill();NSBezierPath(roundedRect:NSRect(x:x,y:y,width:w,height:h),xRadius:r,yRadius:r).fill()}
func label(_ text:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ size:CGFloat,_ hex:String){
 let paragraph=NSMutableParagraphStyle();paragraph.alignment = .center
 let font=NSFont(name:"Hiragino Maru Gothic ProN W4",size:size) ?? NSFont.systemFont(ofSize:size,weight:.bold)
 (text as NSString).draw(in:NSRect(x:x,y:y,width:w,height:size*1.8),withAttributes:[.font:font,.foregroundColor:color(hex),.paragraphStyle:paragraph])
}
func cup(_ x:CGFloat,_ y:CGFloat,_ scale:CGFloat,_ hex:String){
 NSGraphicsContext.saveGraphicsState();let cg=NSGraphicsContext.current!.cgContext;cg.translateBy(x:x,y:y);cg.scaleBy(x:scale,y:scale)
 let glass=NSBezierPath();glass.move(to:NSPoint(x:20,y:20));glass.curve(to:NSPoint(x:180,y:20),controlPoint1:NSPoint(x:60,y:30),controlPoint2:NSPoint(x:140,y:30));glass.line(to:NSPoint(x:162,y:205));glass.curve(to:NSPoint(x:38,y:205),controlPoint1:NSPoint(x:145,y:225),controlPoint2:NSPoint(x:55,y:225));glass.close()
 color("FFFFFF").withAlphaComponent(0.6).setFill();glass.fill();color("99BFB4").setStroke();glass.lineWidth=4;glass.stroke()
 NSGraphicsContext.saveGraphicsState();glass.addClip();rect(20,90,160,140,0,hex);color("FFFFFF").withAlphaComponent(0.6).setStroke();let shine=NSBezierPath();shine.move(to:NSPoint(x:40,y:50));shine.line(to:NSPoint(x:53,y:192));shine.lineWidth=8;shine.lineCapStyle = .round;shine.stroke();NSGraphicsContext.restoreGraphicsState()
 color("99BFB4").setStroke();let rim=NSBezierPath(ovalIn:NSRect(x:20,y:10,width:160,height:22));rim.lineWidth=4;rim.stroke();NSGraphicsContext.restoreGraphicsState()
}
for size in [192,512,180]{render(size,size,size==180 ? "apple-touch-icon.png":"icon-\(size).png"){
 let cg=NSGraphicsContext.current!.cgContext;cg.scaleBy(x:CGFloat(size)/512,y:CGFloat(size)/512)
 rect(0,0,512,512,0,"FFF8EA");rect(30,30,452,452,90,"FFB8A7");cup(105,78,1.5,"A9DCC7");label("✦",340,90,80,65,"FFF8EA");label("✧",55,305,70,45,"FFF8EA")
}}
render(1200,630,"ogp.png"){
 rect(0,0,1200,630,0,"FFF8EA");rect(40,40,1120,550,45,"F8EAD7")
 label("きまぐれ自由帳の、小さなあそび場",50,65,1100,22,"8A7465")
 label("まぜまぜドリンクラボ",40,115,1120,60,"65524F")
 cup(290,230,1.2,"80CDA7");cup(480,210,1.3,"E4AB7E");cup(690,230,1.2,"B29CCD")
 label("好きなものを、好きなだけ。今日はどんな色になる？",30,535,1140,25,"806C58")
}
