# from appdata.data_model import DataModel
from server import boostrap

# db = DataModel()
boostrap()
    
if __name__ == '__main__':
    import cherrypy
    cherrypy.engine.signals.subscribe()
    cherrypy.engine.start()
    cherrypy.engine.block()