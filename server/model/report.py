from servicehandle.sqlitehandler import DatabaseHandler
from appdata import Settings

db = DatabaseHandler('local/data.sqlite')
settings = Settings()

class ReportModel(object):
    version = 'webapp_0.0a'
    obj_class = 'Auth DB Handler'
    cls_attrs = ('user_id', 'role_id', 'menu_id', 'link_id')

    def __str__(self):
        return f"""
            schema version: {self.version}, 
            class: {self.obj_class}, 
            attrs: {self.cls_attrs}
        """
    
    def _query(self, q_type, q_table, q_params, q_keyes):
        return db._query(q_type, q_table, q_params, q_keyes)
    
    def _query_queue(self, queries, query_params, headers=None):
        # print(queries, query_params)
        return db._query_queue(queries, query_params)
    
    def _query_option(self, queries, query_params, headers=None):
        # print(queries, query_params)
        return db._query_option(queries, query_params)
    
    def read(self, query, query_params, headers=None):
        if query_params:
            return db.read(query, query_params)
        return db.read(query)
    
    def insert(self, query, query_params, headers=None):
        if query_params:
            return db.insert(query, query_params)
        return db.insert(query)

    



    