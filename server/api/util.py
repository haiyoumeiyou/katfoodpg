import os
import os.path
import datetime
import json
import cherrypy

from server.model.file import FileModel
from servicehandle.sqlitehandle import SqliteHandle
from servicehandle.csvhandler import CsvHandler
from servicehandle.datahandler import pivotListByKeyCol
from servicehandle.pandashandler import dict_list_to_excel, dict_list_to_excel_self_header, xlxs_to_self_name_list

path = os.path.dirname(os.path.abspath('requirements.txt'))
data_path = os.path.join(path, 'local', 'file_store')
db = FileModel()
db_handle = SqliteHandle(db_path='local/data.sqlite')
csv = CsvHandler()

class UtilREST:

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def order_serial_upload(self, uploaded_file, work_order):
        # check_pass = cherrypy.request.json['check_pass'] if 'check_pass' in cherrypy.request.json else None
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':"order_serial_upload", 'data':data})
        ep_data = cherrypy.request.ep_data
        # print(uploaded_file)
        upload_path = data_path
        original_name = uploaded_file.filename
        uploaded_filename, upload_fileext = os.path.splitext(original_name)
        wo_cmd = "SELECT title FROM orders WHERE eid = :order_id"
        wo_param = json.loads(work_order)
        # print(wo_param, work_order)
        wo = db.read(wo_cmd, wo_param)
        # print(wo)
        if not wo[0] == 'ok':
            return json.dumps(wo)
        # upload_filename = work_order
        upload_filename = ''.join([wo[1][0]['title'], '_sn', upload_fileext])
        # print(upload_fileext)
        upload_file = os.path.normpath(os.path.join(upload_path, upload_filename))
        # print('file called', upload_file)
        size = 0
        with open(upload_file, 'wb') as out:
            while True:
                data_stream = uploaded_file.file.read(8192)
                if not data_stream:
                    break
                out.write(data_stream)
                size += len(data_stream)
            h_data = {
                'file_name':upload_filename,
                'file_ext':upload_fileext,
                'file_path':upload_path,
                'file_size':size,
                'file_content_type':str(uploaded_file.content_type),
                'original_name':original_name,
                'create_date':datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')
            }
            fdir_params = {**h_data, **ep_data}
            fdir_cmd = """
                INSERT INTO file_store_dir (file_name, file_ext, file_path, file_size, file_content_type, original_name, create_date, last_update, last_user) 
                VALUES (:file_name, :file_ext, :file_path, :file_size, :file_content_type, :original_name, :create_date, :last_update, :last_user)
                ON CONFLICT(file_name) DO UPDATE SET file_ext=excluded.file_ext, file_path=excluded.file_path, file_size=excluded.file_size, file_content_type=excluded.file_content_type, create_date=excluded.create_date, last_update=excluded.last_update, last_user=excluded.last_user;
            """
            h_rst = db.insert(fdir_cmd, fdir_params)
            # h_rst = ""
            if not h_rst[0] == 'ok':
                return json.dumps(h_rst)
            data = "Util Rest API Report Upload File: {}, {}, {} for {}, recorded {}. Processing file...".format(uploaded_file.filename, uploaded_file.content_type, size, work_order, h_rst)
            # print(data, upload_fileext)
        try:
            # data_list = []
            if upload_fileext == '.csv':
                data_list = csv.importFromCsv(upload_file)
            if upload_fileext == '.xlsx':
                data_list = xlxs_to_self_name_list(upload_file, 'SN')[0]
            if data_list:
                q_list = []
                today = datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')
                for row in data_list:
                    # print(row)
                    q_row = {'serial_number':str(row['SN']), 'create_date':str(today)}
                    q_params = {**q_row, **wo_param, **ep_data}
                    # print(q_params)
                    q_list.append(q_params)
                as_cmd = """
                    INSERT INTO assm_serial (order_id, serial_number, create_date, last_user, last_update) 
                    VALUES (:order_id, :serial_number, :create_date, :last_user, :last_update)
                    ON CONFLICT(serial_number) DO UPDATE SET order_id=excluded.order_id, last_update=excluded.last_update, last_user=excluded.last_user;
                """
                q_rst = db.insert(as_cmd, q_list)
                if not q_rst[0] == 'ok':
                    return json.dumps(q_rst)
                data += "<br> File data insert status: " + str(q_rst[1])
                return json.dumps(('ok', data))
            
            data += "<br> File reading error, no data list processed."
            return json.dumps(('ko', data), default=str)
        except Exception as e:
            data += "<br>" + str(e)
        
        return json.dumps(('ko', data))

    @cherrypy.expose
    @cherrypy.tools.json_out()
    def order_sndkp_upload(self, uploaded_file, work_order):
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':"order_serial_upload", 'data':data}, default=str)
        ep_data = cherrypy.request.ep_data

        upload_path = data_path
        original_name = uploaded_file.filename
        uploaded_filename, upload_fileext = os.path.splitext(original_name)

        wo_cmd = "SELECT title FROM orders WHERE eid = :order_id"
        wo_param = json.loads(work_order)
        # print(wo_param, work_order)
        wo = db.read(wo_cmd, wo_param)
        # print(wo)
        if not wo[0] == 'ok':
            return json.dumps(wo)
        # upload_filename = work_order
        upload_filename = ''.join([wo[1][0]['title'], '_sndkp', upload_fileext])
        upload_file = os.path.normpath(os.path.join(upload_path, upload_filename))
        # print('file called')
        size = 0
        with open(upload_file, 'wb') as out:
            while True:
                data_stream = uploaded_file.file.read(8192)
                if not data_stream:
                    break
                out.write(data_stream)
                size += len(data_stream)
            h_data = {
                'file_name':upload_filename,
                'file_ext':upload_fileext,
                'file_path':upload_path,
                'file_size':size,
                'file_content_type':str(uploaded_file.content_type),
                'original_name':original_name,
                'create_date':datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S')
            }
            fdir_params = {**h_data, **ep_data}
            # print(fdir_params)
            fdir_cmd = """
                INSERT INTO file_store_dir (file_name, file_ext, file_path, file_size, file_content_type, original_name, create_date, last_update, last_user) 
                VALUES (:file_name, :file_ext, :file_path, :file_size, :file_content_type, :original_name, :create_date, :last_update, :last_user)
                ON CONFLICT(file_name) DO UPDATE SET file_ext=excluded.file_ext, file_path=excluded.file_path, file_size=excluded.file_size, file_content_type=excluded.file_content_type, create_date=excluded.create_date, last_update=excluded.last_update, last_user=excluded.last_user;
            """
            h_rst = db.insert(fdir_cmd, fdir_params)
            # h_rst = ""
            if not h_rst[0] == 'ok':
                return json.dumps(h_rst, default=str)
            data = "Util Rest API Report Upload File: {}, {}, {} for {}, recorded {}. Processing file...".format(uploaded_file.filename, uploaded_file.content_type, size, work_order, h_rst)
            # print(data, upload_fileext)
        return json.dumps(h_rst, default=str)

    @cherrypy.expose
    @cherrypy.tools.json_in()
    def order_sndkp_download(self):
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':"order_serial_upload", 'data':data}, default=str)
        ep_data = cherrypy.request.ep_data

        q_params = cherrypy.request.json
        print(q_params)
        title_query = """
            SELECT o.title FROM orders o WHERE o.eid = :eid
        """
        file_query = """
            SELECT * FROM file_store_dir WHERE file_name LIKE :file_name;
        """
        
        wo = db.read(title_query, q_params)
        # print(wo)
        if not wo[0] == 'ok':
            return json.dumps(wo)
        
        order_title = wo[1][0]['title']

        file_name = ''.join([order_title, '_sndkp.%'])
        file_info = db.read(file_query, {"file_name":file_name})
        # print(file_info)
        if not file_info[0] == 'ok':
            return json.dumps(file_info)

        if len(file_info[1]) > 0:
            filename = file_info[1][0]['file_name']
            filepath = os.path.join(file_info[1][0]['file_path'], file_info[1][0]['file_name'])
            mime = file_info[1][0]['file_content_type']
            downloadname = 'SNDKP.csv'
            disposition = f'attachment; filename="{downloadname}"'
            # print(filepath, mime, filename)
            # cherrypy.response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return cherrypy.lib.static.serve_file(filepath, content_type=mime, disposition=disposition,  name=filename)
            # cherrypy.response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            # cherrypy.response.headers['Content-Type'] = mime
            # with open(filepath, 'rb') as file:
            #     # cherrypy.response.stream = file
            #     # cherrypy.response.headers['Content-Length'] = str(os.path.getsize(file.name))
            #     return file.read()
            # return cherrypy.response.stream
        return json.dumps(("ko", "File not found."))

    @cherrypy.expose
    @cherrypy.tools.json_in()
    def part_sn_report_dl(self):
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':"part_sn_report_dl", 'data':data}, default=str)
        ep_data = cherrypy.request.ep_data

        q_params = cherrypy.request.json
        # print(q_params)
        title_query = """
            SELECT o.title FROM orders o WHERE o.eid = :eid
        """
        columns_query = """
            SELECT DISTINCT ac.eid, ac.category || ' (' || ac.slot || ')' as title 
            FROM orders o INNER JOIN model m on o.model_id = m.eid 
                INNER JOIN assm_config ac on m.assm_id = ac.assm_id 
                LEFT OUTER JOIN (SELECT i.v_name, i.category 
                                FROM order_lines ol INNER JOIN items i on ol.item_id = i.eid 
                                WHERE ol.order_id = 2) as i on ac.category = i.category 
            WHERE o.eid = :eid
            ORDER BY ac.eid ASC
        """
        part_query = """
            SELECT aps.*, ac.category || ' (' || ac.slot || ')' as field 
            FROM assm_part_serial aps INNER JOIN assm_serial a ON aps.assm_serial = a.serial_number
                    INNER JOIN assm_config ac ON aps.assm_conf_id = ac.eid
            WHERE a.order_id = :eid
            ORDER BY aps.assm_serial, ac.eid ASC
        """

        wo = db.read(title_query, q_params)
        # print(wo)
        if not wo[0] == 'ok':
            return json.dumps(wo)
        
        order_title = wo[1][0]['title']
        today = datetime.datetime.today().strftime("%Y_%m_%d_%H_%M")
        
        filename = ''.join([order_title, '_report_', today, '.xlsx'])
        filepath = os.path.normpath(os.path.join(data_path, filename))

        columns = db.read(columns_query, q_params)
        parts = db.read(part_query, q_params)

        if not columns[0] == 'ok':
            return json.dumps(columns)
        if not parts[0] == 'ok':
            return json.dumps(parts)
        
        data = pivotListByKeyCol(parts[1], 'assm_serial', 'field', 'part_sn')
        if len(data) > 0:
            # headers = list(data[0].keys())
            headers = ['assm_serial'] + [row['title'] for row in columns[1]]
            dict_list_to_excel(data, headers, order_title, filepath)
            mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            # return cherrypy.lib.static.serve_file(file_path, mime, data_filename)
            disposition = f'attachment; filename="{filename}"'
            # print(filepath, mime, filename)
            # cherrypy.response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return cherrypy.lib.static.serve_file(filepath, content_type=mime, disposition=disposition,  name=filename)
        
        return json.dumps(("ko", "Data not found."))
    
    @cherrypy.expose
    @cherrypy.tools.json_in()
    def item_report_download(self):
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':"part_sn_report_dl", 'data':data}, default=str)
        ep_data = cherrypy.request.ep_data

        q_params = cherrypy.request.json
        # print(q_params)
        queries = [
            {"option_6":"SELECT * FROM items WHERE eid in (SELECT DISTINCT item_id FROM transactions) AND category = :category and vendor_code = :vendor_code and (eid like :search or v_sku like :search or v_name like :search or v_description like :search)"},
            {"option_5":"SELECT * FROM items WHERE eid in (SELECT DISTINCT item_id FROM transactions) AND vendor_code = :vendor_code and (eid like :search or v_sku like :search or v_name like :search or v_description like :search)"},
            {"option_4":"SELECT * FROM items WHERE eid in (SELECT DISTINCT item_id FROM transactions) AND (eid like :search or v_sku like :search or v_name like :search or v_description like :search)"},
            {"option_3":"SELECT * FROM items WHERE eid in (SELECT DISTINCT item_id FROM transactions) AND vendor_code = :vendor_code and category = :category"},
            {"option_2":"SELECT * FROM items WHERE eid in (SELECT DISTINCT item_id FROM transactions) AND vendor_code = :vendor_code"},
            {"option_1":"SELECT * FROM items WHERE eid in (SELECT DISTINCT item_id FROM transactions) AND category = :category"}
        ] 

        wo = db._query_option(queries, q_params)
        # print(wo[1])
        if not wo[0] == 'ok':
            return json.dumps(wo)
        
        order_title = 'item_search_report_'
        today = datetime.datetime.today().strftime("%Y_%m_%d_%H_%M")
        
        filename = ''.join([order_title, '_report_', today, '.xlsx'])
        filepath = os.path.normpath(os.path.join(data_path, filename))
        
        data = wo[1]
        headers = ['v_sku', 'v_name', 'category', 'v_description', 'quantity', 'vendor_code']
        if len(data) > 0:
            dict_list_to_excel(data, headers, order_title, filepath)
            mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            # return cherrypy.lib.static.serve_file(file_path, mime, data_filename)
            disposition = f'attachment; filename="{filename}"'
            # print(filepath, mime, filename)
            # cherrypy.response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return cherrypy.lib.static.serve_file(filepath, content_type=mime, disposition=disposition,  name=filename)
        
        return json.dumps(("ko", "Data not found."))
    
    @cherrypy.expose
    @cherrypy.tools.json_in()
    def order_search_download(self):
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':"part_sn_report_dl", 'data':data}, default=str)
        ep_data = cherrypy.request.ep_data

        q_params = cherrypy.request.json
        params_list = ["title", "vendor", "model", "begin_date", "end_date"]
        filtered_params = {k: v for k, v in q_params.items() if k in params_list}
        def order_search(title=None, vendor=None, model=None, begin_date=None, end_date=None):
            q_cmd = """
                SELECT o.*, strftime('%Y-%m-%d', datetime(o.create_date, '-08:00')) as CreationDate, 
                    m.title as model_name, ac.acct_name, ifnull(scan.scan_count, 0) || '/' || ifnull(asm.quantity, 0) as quantity, 
                    ifnull(scan.scan_count, 0) as scan_count, shp.ship_status 
                FROM orders o 
                    LEFT JOIN model m ON o.model_id = m.eid 
                    LEFT JOIN accounts ac ON o.vendor_id = ac.eid 
                    LEFT JOIN (SELECT COUNT(*) as quantity, order_id 
                                FROM assm_serial GROUP BY order_id) as asm ON o.eid = asm.order_id 
                    LEFT JOIN (SELECT count(DISTINCT aps.assm_serial) as scan_count, a.order_id 
                                FROM assm_part_serial aps INNER JOIN assm_serial a ON aps.assm_serial = a.serial_number GROUP BY a.order_id) as scan on o.eid = scan.order_id 
                    LEFT JOIN (SELECT title, status || '_' || strftime('%Y-%m-%d', datetime(last_update, '-08:00')) ship_status FROM orders WHERE order_type = 'ship') as shp ON o.title = shp.title 
                WHERE o.order_type = 'work' 
            """
            params_list = []
            if title:
                q_cmd += f" AND o.title LIKE ?"
                params_list.append('%{}%'.format(title))
            if vendor:
                q_cmd += f" AND ac.acct_code LIKE ?"
                params_list.append('%{}%'.format(vendor))
            if model:
                q_cmd += f" AND m.title LIKE ?"
                params_list.append('%{}%'.format(model))
            if begin_date:
                q_cmd += f" AND o.create_date >= ?"
                params_list.append('{}'.format(begin_date))   
            if end_date:
                q_cmd += f" AND o.create_date <= ?"
                params_list.append('{}'.format(end_date))     
            order_clause = " ORDER BY o.eid DESC"
            q_cmd += order_clause
            params = tuple(params_list)
            # print(q_cmd, params)
            return db_handle.execute_query(query=q_cmd, params=params)
        
        wo = order_search(**filtered_params)
        if not wo[0] == 'ok':
            return json.dumps(wo)
        
        order_title = 'order_search'
        today = datetime.datetime.today().strftime("%Y_%m_%d_%H_%M")
        
        filename = ''.join([order_title, '_report_', today, '.xlsx'])
        filepath = os.path.normpath(os.path.join(data_path, filename))
        
        data = wo[1]
        headers = ['eid', 'title', 'order_type', 'model_name', 'quantity', 'status', 'ship_status', 'CreationDate', 'acct_name', 'scan_count', 'remark']
        if len(data) > 0:
            dict_list_to_excel(data, headers, order_title, filepath)
            mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            # return cherrypy.lib.static.serve_file(file_path, mime, data_filename)
            disposition = f'attachment; filename="{filename}"'
            # print(filepath, mime, filename)
            # cherrypy.response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return cherrypy.lib.static.serve_file(filepath, content_type=mime, disposition=disposition,  name=filename)
        
        return json.dumps(("ko", "Data not found."))
