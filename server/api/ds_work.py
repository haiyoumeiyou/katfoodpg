import json
import logging
import cherrypy
from typing import Dict, List, Any, Optional
from appdata import AppDataReader
from server.model.work import WorkModel

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

EndpointDataReader = AppDataReader()
db = WorkModel()

class BaseController:
    """Base controller class with common utilities"""
    
    @staticmethod
    def validate_request() -> None:
        """Validate authentication and authorization"""
        if not getattr(cherrypy.request, 'ep_data', {}).get('check_pass'):
            raise cherrypy.HTTPError(401, "Unauthorized access")
    
    @staticmethod
    def parse_request_params() -> Dict[str, Any]:
        """Parse and sanitize request parameters"""
        params = {
            **(cherrypy.request.json or {}),
            **(getattr(cherrypy.request, 'ep_data', {}))
        }
        params.pop('check_pass', None)
        return params

class WorkDataREST(BaseController):
    """Main REST API controller for work data endpoints"""
    
    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def default(self, endpoint: str, *args, **kwargs) -> Dict[str, Any]:
        """Handle dynamic endpoints"""
        handler = getattr(self, f"handle_{endpoint}", None)
        if not handler:
            raise cherrypy.HTTPError(404, "Endpoint not found")
        return handler(*args, **kwargs)

def create_endpoint_handler(endpoint_config: Dict[str, Any]):
    """Factory function to create endpoint handlers with proper closure"""
    
    @cherrypy.expose
    @cherrypy.tools.json_in()
    @cherrypy.tools.json_out()
    def endpoint_handler(self) -> Dict[str, Any]:
        try:
            # Authentication
            BaseController.validate_request()
            
            # Parameter processing
            params = self.parse_request_params()
            data_list = params.pop('data_list', None)
            
            if data_list:
                params = [{**item, **params} for item in data_list]
            
            # Query execution
            data_meta = endpoint_config['data']
            handler_name = data_meta['handler']
            query_type = data_meta.get('q_type')
            
            if query_type:
                result = execute_structured_query(data_meta, params)
            else:
                result = execute_direct_query(data_meta, params)
            
            return {
                'endpoint': endpoint_config['endpoint'],
                'data': result
            }
            
        except Exception as e:
            logger.error("Endpoint error: %s", str(e))
            raise cherrypy.HTTPError(500, str(e))
    
    def execute_structured_query(self, data_meta: Dict, params: Dict) -> Any:
        """Execute structured database query"""
        q_fields = data_meta.get('q_fields', [])
        for field in q_fields:
            if field not in data_meta.get('q_keyes', []):
                params[field] = ''
        
        return getattr(db, data_meta['handler'])(
            data_meta['q_type'],
            data_meta['q_table'],
            {**params, **data_meta.get('q_params', {})},
            data_meta['q_keyes']
        )
    
    def execute_direct_query(self, data_meta: Dict, params: Dict) -> Any:
        """Execute direct database query"""
        return getattr(db, data_meta['handler'])(
            data_meta['query'],
            {**params, **data_meta.get('q_params', {})},
            cherrypy.request.headers
        )
    
    # Set proper name for the handler
    endpoint_handler.__name__ = f"handle_{endpoint_config['endpoint']}"
    return endpoint_handler

def register_endpoints() -> None:
    """Register all endpoints from configuration"""
    endpoint_data_list = EndpointDataReader.getEndpointData('work.json', '::')
    
    for endpoint in endpoint_data_list:
        validate_endpoint_config(endpoint)
        handler = create_endpoint_handler(endpoint)
        setattr(WorkDataREST, handler.__name__, handler)

def validate_endpoint_config(config: Dict) -> None:
    """Validate endpoint configuration structure"""
    required_keys = ['endpoint', 'data', 'handler']
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required endpoint config key: {key}")
