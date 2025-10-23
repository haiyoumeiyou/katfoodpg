import json
import cherrypy

from appdata import AppDataReader
from server.model.receiving import RecvModel

EndpointDataReader = AppDataReader()
db = RecvModel()

class RecvDataREST(object):
    pass

def add_endpoint(cls, endpoint):
    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def endpointFunc(self):
        # check_pass = cherrypy.request.json['check_pass'] if 'check_pass' in cherrypy.request.json else None
        check_pass = cherrypy.request.ep_data['check_pass'] if 'check_pass' in cherrypy.request.ep_data else None
        if not check_pass:
            data = ('ia', 'invalid access')
            return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data})
        
        req_params = cherrypy.request.json or {}
        ep_data = cherrypy.request.ep_data or {}
        q_params = {**req_params, **ep_data}
        
        if 'check_pass' in q_params:
            q_params.pop('check_pass')
        if 'data_list' in q_params:
            data_list = q_params['data_list']
            q_params.pop('data_list')
            if data_list:
                merge_list = []
                for row in data_list:
                    row = {**row, **q_params}
                    merge_list.append(row)
            q_params = merge_list
            
        req_header = cherrypy.request.headers or None
        # print('req headers: ', q_params)
        data = endpoint['data'].get('sample_data', [])
        # print(data)
        data_meta = endpoint['data'].get('data', None)
        if data_meta:
            # print(data_meta['handler'], data_meta['query'])
            if 'q_type' in data_meta:
                if 'q_fields' in data_meta:
                    for field in data_meta['q_fields']:
                        if field not in data_meta['q_keyes']:
                            q_params[field] = ''
                if 'q_params' in data_meta:
                    q_params = {**q_params, **data_meta['q_params']}
                data = getattr(db, data_meta['handler'])(data_meta['q_type'], data_meta['q_table'], q_params, data_meta['q_keyes'])
                return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data})
            
            if 'q_params' in data_meta:
                q_params = {**q_params, **data_meta['q_params']}
            data = getattr(db, data_meta['handler'])(data_meta['query'], q_params, req_header)
        return json.dumps({'endpoint':str(endpoint['endpoint']), 'data':data})
    endpointFunc.__name__ = str(endpoint['endpoint'])
    setattr(cls, endpointFunc.__name__, classmethod(endpointFunc))

endpoint_data_list = EndpointDataReader.getEndpointData('recv.json', '::')
for endpoint in endpoint_data_list:
    # print(endpoint['endpoint'])
    add_endpoint(RecvDataREST, endpoint)
