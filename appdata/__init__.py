import os
import json

class AppDataReader(object):
    _root_path = None
    _base_path = None
    def __init__(self, file_path=None) -> None:
        self._root_path = os.path.dirname(os.path.abspath('requirements.txt'))
        self._base_path = file_path or os.path.join(self._root_path, 'appdata')

    def setBasePath(self, base_path):
        self._base_path = base_path
    
    def loadDataFromFile(self, file_path):
        with open(file_path, "r") as f:
            data = json.load(f)
            return data
        
    def filterDataByAuthset(self, data, auth_set):
        filtered_data = {}
        for key, val in data.items():
            if key != "data_endpoint":
                if isinstance(val, str):
                    filtered_data[key] = val
                if isinstance(val, list):
                    # print(val)
                    filtered_data[key] = list(filter(lambda e: ('auth' not in e or ('auth' in e and (len(e['auth'])==0 or len(set(e['auth'])&set(auth_set))>0))), val))
                if isinstance(val, dict):
                    filtered_data[key] = self.filterDataByAuthset(val, auth_set)
        return filtered_data
    
    def getAuthData(self, file_name=None, auth_set=[]):
        if (file_name):
            meta_source = file_name.split("::")
        file_path = os.path.join(self._base_path, meta_source[0])
        return self.filterDataByAuthset(self.loadDataFromFile(file_path), auth_set)['::'+meta_source[1]] if len(meta_source)==2 else self.filterDataByAuthset(self.loadDataFromFile(file_path), auth_set)
    
    def filterDataByEndpointPrefix(self, data, endpoint_prefix):
        filtered_data = []
        endpoint_prefix = endpoint_prefix if endpoint_prefix else '::'
        for key, val in data.items():
            if (key.startswith(endpoint_prefix)):
                data = {"msg":"under construction"}
                if ('data_endpoint') in val:
                    data = val['data_endpoint']
                new_row = {"endpoint":key.replace(endpoint_prefix, ''), "data":data}
                filtered_data.append(new_row)
        return filtered_data

    def getEndpointData(self, file_name=None, endpoint_prefix=None):
        if (file_name):
            meta_source = file_name.split("::")
        file_path = os.path.join(self._base_path, meta_source[0])
        return self.filterDataByEndpointPrefix(self.loadDataFromFile(file_path), endpoint_prefix if endpoint_prefix else '::')
    
    def getEndpointPermission(self, endpoint_path):
        file_info = endpoint_path.split('/')
        file_path = os.path.join(self._base_path, file_info[1] + '.json')
        data = self.loadDataFromFile(file_path)
        data_node = '::' + file_info[2]
        endpoint_info = data[data_node] if data_node in data else None
        permission_set = []
        if endpoint_info:
            permission_set = endpoint_info["auth"] if "auth" in endpoint_info else []
        return permission_set

    def getLocalConfigByKey(self, key):
        settings = Settings()
        print(settings.__dict__)
        return settings[key] if key in settings else None

class Settings:
    _config_location = 'local\config.json'

    def __init__(self):
        if os.path.exists(self._config_location):
            self.__dict__ = json.load(open(self._config_location))
        else:
            self.__dict__ = {
                'jwt_key': 'rabbitrabbit'
            }
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        json.dump(self.__dict, open(self._config_location, 'w'))