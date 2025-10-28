import os
import os.path
import datetime
import json
import cherrypy

from appdata import AppDataReader
from server.model.file import FileModel

path = os.path.dirname(os.path.abspath('requirements.txt'))
data_path = os.path.join(path, 'local', 'file_store')
EndpointDataReader = AppDataReader()
db = FileModel()

class FileDataREST(object):
    pass

def add_json_endpoint(cls, endpoint):
    @cherrypy.expose
    @cherrypy.tools.json_in()
    def endpointFunc(self):
        # check_pass = cherrypy.request.json['check_pass'] if 'check_pass' in cherrypy.request.json else None
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data}, default=str)
        
        req_params = cherrypy.request.json or {}
        ep_data = cherrypy.request.ep_data or {}
        q_params = {**req_params, **ep_data}
        if 'check_pass' in q_params:
            q_params.pop('check_pass')
        req_header = cherrypy.request.headers or None
        # print('req headers: ', q_params)
        data = endpoint['data'].get('sample_data', [])
        # print(data)
        data_meta = endpoint['data'].get('data', None)
        if data_meta:
            print(data_meta['handler'], data_meta['query'], data_meta)
            if 'q_type' in data_meta:
                if 'q_fields' in data_meta:
                    for field in data_meta['q_fields']:
                        if field not in data_meta['q_keyes']:
                            q_params[field] = ''
                if 'q_params' in data_meta:
                    q_params = {**q_params, **data_meta['q_params']}
                data = getattr(db, data_meta['handler'])(data_meta['q_type'], data_meta['q_table'], q_params, data_meta['q_keyes'])

                # return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data})
                return cherrypy.lib.static.serve_fileobj(data, content_type=data_meta['content_type'])
            
            if 'q_params' in data_meta:
                q_params = {**q_params, **data_meta['q_params']}
            data = getattr(db, data_meta['handler'])(data_meta['query'], q_params, data_meta['file_handle'])
        # return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data})
            mime = data_meta["content_type"]
            file_name = data_meta["file_name"] if "file_name" in data_meta else "downloaded_file"
            cherrypy.response.headers["Content-Type"] = mime
        return cherrypy.lib.static.serve_fileobj(data, content_type=mime, name=file_name)
    endpointFunc.__name__ = str(endpoint['endpoint'])
    setattr(cls, endpointFunc.__name__, classmethod(endpointFunc))

def add_file_endpoint(cls, endpoint):
    @cherrypy.expose
    # @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def endpointFunc(self,  uploaded_file, params):
        # check_pass = cherrypy.request.json['check_pass'] if 'check_pass' in cherrypy.request.json else None
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data}, default=str)
        
        upload_path = data_path
        uploaded_filename, upload_fileext = os.path.splitext(uploaded_file.filename)
        upload_filename = params
        # print(upload_fileext)
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
                'create_date':datetime.date.today()
            }
            # h_rst = file_handle.mod_file_record_create(h_data)
            h_rst = ""
            data = "Util Rest API Report Upload File: {}, {}, {} for {}, recorded {}. Processing file...".format(uploaded_file.filename, uploaded_file.content_type, size, params, h_rst)
            # print(data, upload_fileext)
        return None
    endpointFunc.__name__ = str(endpoint['endpoint'])
    setattr(cls, endpointFunc.__name__, classmethod(endpointFunc))

endpoint_data_list = EndpointDataReader.getEndpointData('file.json', '::')
for endpoint in endpoint_data_list:
    # print(endpoint['endpoint'], endpoint)
    if (endpoint['data'] and endpoint['data']['data_type']):
        if endpoint['data']['data_type'] == 'json':
            # print(endpoint['endpoint'], endpoint)
            add_json_endpoint(FileDataREST, endpoint)
        if endpoint['data']['data_type'] == 'file':
            # print(endpoint['endpoint'], endpoint)
            add_file_endpoint(FileDataREST, endpoint)
