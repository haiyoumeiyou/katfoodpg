from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase.pdfmetrics import stringWidth, getAscentDescent
from reportlab.graphics.barcode import code128
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib import colors


class PdfHandler(object):

    def palletLabelHalfA4(self, data, ids_in_page):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        buffer.seek(0)
        w, h = A4

        # c.setFontSize(60)
        style = getSampleStyleSheet()["Normal"]
        style.fontSize = 60
        font_size = style.fontSize
        font_name = style.fontName

        ascent, descent = getAscentDescent(font_name, font_size)
        height = ascent - descent

        p_data = data 
        if isinstance(data, list):
            p_data = data[0] 
        p_id = p_data['title']
        p_rem = p_data['remark'] if 'remark' in data else ''
        p_count = p_data['pallet_count']

        current_in_page = 0
        for i in range(p_count):
            p_barcode = '-'.join([str(p_id), str(i+1)])
            barcode = code128.Code128(p_barcode,barWidth=0.5*mm,barHeight=20*mm,humanReadable=True)
            barcode._calculate()
            barWidth, barHeight = barcode._width, barcode._height

            c.setFontSize(60)
            y = h * (3 - current_in_page * 2) / 4
            current_in_page += 1

            x = (w - barWidth) / 2
            barcode.drawOn(c, x, y+barHeight+height)

            label = str(p_id)
            label_w = stringWidth(label, font_name, font_size)
            x = (w - label_w) / 2
            c.drawString(x, y+height, label)

            sub_label = '/'.join([str(i+1), str(p_count)])
            sub_label_w = stringWidth(sub_label, font_name, font_size)
            x = (w - sub_label_w) / 2
            c.drawString(x, y-15, sub_label)

            if p_rem and len(p_rem) > 0:
                c.setFontSize(45)
                r_label = str(p_rem)
                r_label_w = stringWidth(r_label, font_name, 45)
                x = (w - r_label_w) / 2
                c.drawString(x, y - 70, r_label)

            if (current_in_page == ids_in_page):
                current_in_page = 0
                c.showPage()
        c.save()

        pdf_data = buffer.getvalue()

        return pdf_data
    
    def palletShipLabelA4(self, data, ids_in_page):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        buffer.seek(0)
        w, h = A4

        style = getSampleStyleSheet()["Normal"]
        style.fontSize = 50
        font_size = style.fontSize
        font_name = style.fontName

        ascent, descent = getAscentDescent(font_name, font_size)
        height = ascent - descent

        # if isinstance(data, list):
        # print(data)
        p_data = data[0] 
        p_id = p_data['container_code']
        p_count = len(data)

        ids_in_page = 30
        ids_in_row = 3
        current_in_page = 0
        current_in_row = 0
        page_number = 0
        for i in data:
            if current_in_page == 0:
                c.setFontSize(20)
                label = str(p_id).strip()
                label_w = stringWidth(label, font_name, font_size)
                y = h-85
                x = (w - label_w / 2 ) / 2
                c.drawString(x, y+height, label)

                barcode = code128.Code128(label,barWidth=0.3*mm,barHeight=6*mm,humanReadable=True)
                barcode._calculate()
                barWidth, barHeight = barcode._width, barcode._height
                y = h-110
                # x = (w - barWidth /2 ) / 2
                barcode.drawOn(c, x, y+height)

                page_number += 1
                c.setFontSize(15)
                pn_label = ' '.join(['Page', str(page_number)])
                pn_label_w = stringWidth(pn_label, font_name, font_size)
                y = h-135
                x = (w - pn_label_w / 2 ) / 2
                c.drawString(x, y+height, pn_label)

                y = h-145
                x = 50
                c.line(x, y+height, w-x, y+height)
            
            current_in_page += 1
            current_in_row += 1
            if current_in_row == 1:
                y = h - 178 - (22 * current_in_page)

            p_barcode = str(i['unit_serial'])
            barcode = code128.Code128(p_barcode,barWidth=0.2*mm,barHeight=8*mm,humanReadable=True)
            barcode._calculate()
            barWidth, barHeight = barcode._width, barcode._height

            c.setFontSize(25)
        
            x = ((w - barWidth * ids_in_row) / 2) + barWidth * (current_in_row - 1)
            barcode.drawOn(c, x, y+barHeight+height)

            if (current_in_row == ids_in_row):
                current_in_row = 0

            if (current_in_page == ids_in_page):
                current_in_page = 0
                c.showPage()

        c.save()

        pdf_data = buffer.getvalue()

        return pdf_data
    
    def packingListA4(self, data, ids_in_page):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        buffer.seek(0)
        w, h = A4
        
        style = getSampleStyleSheet()["Normal"]
        style.fontSize = 20
        font_size = style.fontSize
        font_name = style.fontName

        styles = getSampleStyleSheet()
        styleN = styles["BodyText"]
        styleN.alignment = TA_LEFT
        styleBH = styles["Normal"]
        styleBH.alignment = TA_CENTER

        ascent, descent = getAscentDescent(font_name, font_size)
        height = ascent - descent

        # if isinstance(data, list):
        # print(data)
        p_data = data[0] 
        p_order = p_data['order_title']
        p_vendor = p_data['vendor_title']
        p_trucker = p_data['trucker_title'] if p_data['trucker_title'] else ''
        p_pallet_count = p_data['pallet_count']
        p_count = len(data)

        t_data = []
        ids_in_page = 25
        current_in_page = 0
        page_number = 0
        for i in data:
            p_count -= 1
            if current_in_page == 0:
                y = h-85
                x = 50
                c.setFontSize(20)

                vendor_label = str(p_vendor).strip()
                vendor_label_w = stringWidth(vendor_label, font_name, font_size)
                c.drawString(x, y+height, vendor_label)

                order_label = str(p_order).strip()
                label_w = stringWidth(order_label, font_name, font_size)
                c.drawString(x, y+height-20, order_label)

                trucker_label = str(p_trucker).strip()
                trucker_label_w = stringWidth(trucker_label, font_name, font_size)
                c.drawString(w-x-trucker_label_w, y+height, trucker_label)

                pallet_count_label = str(p_pallet_count).strip() + ' Pallet(s)'
                pallet_count_label_w = stringWidth(pallet_count_label, font_name, font_size)
                c.drawString(w-x-pallet_count_label_w, y+height-20, pallet_count_label)

                page_number += 1
                c.setFontSize(15)
                pn_label = ' '.join(['Page', str(page_number)])
                pn_label_w = stringWidth(pn_label, font_name, font_size)
                y = h-135
                x = (w - pn_label_w / 2 ) / 2
                c.drawString(x, y+height, pn_label)

                y = h-145
                x = 50
                c.line(x, y+height, w-x, y+height)

                t_data = []
                hsku = Paragraph('''<b>SKU</b>''', styleBH)
                hcategory = Paragraph('''<b>Category</b>''', styleBH)
                hname = Paragraph('''<b>Item Description</b>''', styleBH)
                hquantity = Paragraph('''<b>Quantity</b>''', styleBH)
                t_data.append([hsku, hcategory, hname, hquantity])
            
            rsku = Paragraph(str(i["v_sku"]), styleN)
            rcategory = Paragraph(str(i["category"]), styleN)
            rname = Paragraph(str(i["v_description"]), styleN)
            rquantity = Paragraph(str(i["quantity"]), styleN)
            t_data.append([rsku, rcategory, rname, rquantity])

            current_in_page += 1
            
            if (current_in_page == ids_in_page or p_count <1):
                y = h - 135
                x = 50
                table = Table(t_data, colWidths=[4*cm, 2*cm, 9.5*cm, 2*cm])
                table.setStyle(TableStyle([('INNERGRID', (0,0), (-1,-1), 0.25, colors.black),
                                           ('BOX', (0,0), (-1,-1), 0.25, colors.black)
                                            ]))
                
                t_w, t_h = table.wrap(0, 0)
                # print(t_w, t_h)
                table.wrapOn(c, t_w, t_h)
                table.drawOn(c, x, y-t_h)
            if (current_in_page == ids_in_page):
                current_in_page = 0
                c.showPage()

        c.save()

        pdf_data = buffer.getvalue()

        return pdf_data
    
    def accessoryBarcodeA4(self, data, ids_in_page):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        buffer.seek(0)
        w, h = A4

        style = getSampleStyleSheet()["Normal"]
        style.fontSize = 20
        font_size = style.fontSize
        font_name = style.fontName

        ascent, descent = getAscentDescent(font_name, font_size)
        height = ascent - descent

        # if isinstance(data, list):
        # print(data)
        p_data = data[0] 
        p_id = p_data['container_code']
        p_count = len(data)

        ids_in_page = 30
        ids_in_row = 3
        current_in_page = 0
        current_in_row = 0
        page_number = 0
        for i in data:
            if current_in_page == 0:
                c.setFontSize(20)
                label = str(p_id).strip()
                label_w = stringWidth(label, font_name, font_size)
                y = h-85
                x = (w - label_w / 2 ) / 2
                c.drawString(x, y+height, label)

                barcode = code128.Code128(label,barWidth=0.3*mm,barHeight=6*mm,humanReadable=True)
                barcode._calculate()
                barWidth, barHeight = barcode._width, barcode._height
                y = h-110
                # x = (w - barWidth /2 ) / 2
                barcode.drawOn(c, x, y+height)

                page_number += 1
                c.setFontSize(15)
                pn_label = ' '.join(['Page', str(page_number)])
                pn_label_w = stringWidth(pn_label, font_name, font_size)
                y = h-135
                x = (w - pn_label_w / 2 ) / 2
                c.drawString(x, y+height, pn_label)

                y = h-145
                x = 50
                c.line(x, y+height, w-x, y+height)
            
            current_in_page += 1
            current_in_row += 1
            if current_in_row == 1:
                y = h - 178 - (22 * current_in_page)

            p_barcode = str(i['unit_serial'])
            barcode = code128.Code128(p_barcode,barWidth=0.2*mm,barHeight=8*mm,humanReadable=True)
            barcode._calculate()
            barWidth, barHeight = barcode._width, barcode._height

            c.setFontSize(25)
        
            x = ((w - barWidth * ids_in_row) / 2) + barWidth * (current_in_row - 1)
            barcode.drawOn(c, x, y+barHeight+height)

            if (current_in_row == ids_in_row):
                current_in_row = 0

            if (current_in_page == ids_in_page):
                current_in_page = 0
                c.showPage()

        c.save()

        pdf_data = buffer.getvalue()

        return pdf_data

    def serialListA4(self, data, ids_in_page):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        buffer.seek(0)
        w, h = A4

        style = getSampleStyleSheet()["Normal"]
        style.fontSize = 50
        font_size = style.fontSize
        font_name = style.fontName

        ascent, descent = getAscentDescent(font_name, font_size)
        height = ascent - descent

        # if isinstance(data, list):
        # print(data)
        p_data = data[0] 
        p_id = p_data['order_id']
        p_count = len(data)

        ids_in_page = 30
        ids_in_row = 3
        current_in_page = 0
        current_in_row = 0
        page_number = 0
        for i in data:
            if current_in_page == 0:
                c.setFontSize(20)
                label = str(p_id).strip()
                label_w = stringWidth(label, font_name, font_size)
                y = h-85
                x = (w - label_w / 2 ) / 2
                c.drawString(x, y+height, label)

                barcode = code128.Code128(label,barWidth=0.35*mm,barHeight=5*mm,humanReadable=True)
                barcode._calculate()
                barWidth, barHeight = barcode._width, barcode._height
                y = h-110
                # x = (w - barWidth /2 ) / 2
                barcode.drawOn(c, x, y+height)

                page_number += 1
                c.setFontSize(15)
                pn_label = ' '.join(['Page', str(page_number)])
                pn_label_w = stringWidth(pn_label, font_name, font_size)
                y = h-135
                x = (w - pn_label_w / 2 ) / 2
                c.drawString(x, y+height, pn_label)

                y = h-145
                x = 50
                c.line(x, y+height, w-x, y+height)
            
            current_in_page += 1
            current_in_row += 1
            if current_in_row == 1:
                y = h - 178 - (22 * current_in_page)

            p_barcode = str(i['serial_number'])
            barcode = code128.Code128(p_barcode,barWidth=0.26*mm,barHeight=7*mm,humanReadable=True)
            barcode._calculate()
            barWidth, barHeight = barcode._width, barcode._height

            c.setFontSize(25)
        
            x = ((w - barWidth * ids_in_row) / 2) + barWidth * (current_in_row - 1)
            barcode.drawOn(c, x, y+barHeight+height)

            if (current_in_row == ids_in_row):
                current_in_row = 0

            if (current_in_page == ids_in_page):
                current_in_page = 0
                c.showPage()

        c.save()

        pdf_data = buffer.getvalue()

        return pdf_data
    
    def serialListUline8599(self, data, ids_in_page):
        buffer = BytesIO()
        page_size = (2.25 * inch, 0.75 * inch)
        c = canvas.Canvas(buffer, pagesize=page_size)
        buffer.seek(0)
        w, h = page_size

        style = getSampleStyleSheet()["Normal"]
        style.fontSize = 50
        font_size = style.fontSize
        font_name = style.fontName

        ascent, descent = getAscentDescent(font_name, font_size)
        height = ascent - descent

        # if isinstance(data, list):
        # print(data)
        count = 0
        for i in data:
            c.setFontSize(8)
            label = str(i['title']).strip()
            # label_w = stringWidth(label, font_name, font_size)
            c.drawString(1, h-8, label)
            count += 1
            c_label = str(count)
            # c_label_w = stringWidth(c_label, font_name, font_size)
            c.drawString(w-16, h-8, c_label)

            p_barcode = str(i['serial_number'])
            barcode = code128.Code128(p_barcode,barWidth=0.26*mm,barHeight=7*mm,humanReadable=True)
            barcode._calculate()
            barWidth, barHeight = barcode._width, barcode._height

            c.setFontSize(25)
        
            x = (w - barWidth) / 2
            y = (h - barHeight) /2
            barcode.drawOn(c, x, y)
            c.showPage()

        c.save()

        pdf_data = buffer.getvalue()

        return pdf_data






