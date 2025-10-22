from typing import Dict, Any, List, Set, Optional, Union
from pathlib import Path
import json
import hashlib


class AppDataReader:
    """带缓存和业务逻辑的增强版数据读取器"""
    """统一数据访问接口，整合权限和端点处理"""
    
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = self._resolve_base_dir(base_dir)
        self._cache: Dict[Path, Dict] = {}
        self.hash_block_size = 4096

    # 基础方法保持之前的核心逻辑
    def _resolve_base_dir(self, base_dir: Optional[str]) -> Path:
        if base_dir:
            return Path(base_dir).resolve()
        root_path = Path('requirements.txt').resolve().parent
        return root_path / 'hostdata'
    
    def _resolve_file_path(self, filename: str) -> Path:
        full_path = (self.base_dir / filename).with_suffix('.json')
        if not full_path.exists():
            raise FileNotFoundError(f"数据文件不存在: {filename}")
        return full_path.resolve()

    def _calculate_file_hash(self, path: Path) -> str:
        hasher = hashlib.sha256()
        with path.open('rb') as f:
            while chunk := f.read(self.hash_block_size):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _load_and_cache(self, path: Path, file_hash: str) -> Dict[str, Any]:
        try:
            with path.open(encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"无效的JSON内容: {path.name}") from e
            
        self._cache[path] = {"hash": file_hash, "data": data}
        return data

    def load(self, filename: str) -> Dict[str, Any]:
        file_path = self._resolve_file_path(filename)
        
        try:
            current_hash = self._calculate_file_hash(file_path)
        except FileNotFoundError:
            self._cache.pop(file_path, None)
            raise FileNotFoundError(f"数据文件不存在: {filename}") from None

        if cached := self._cache.get(file_path):
            if cached["hash"] == current_hash:
                return cached["data"]
        
        return self._load_and_cache(file_path, current_hash)

    # 统一查询接口
    def query(
        self,
        resource: str,
        *,
        auth_set: Optional[Set[str]] = None,
        endpoint_prefix: Optional[str] = None,
        return_permissions: bool = False
    ) -> Union[Dict, List[Dict], Set[str]]:
        """
        统一数据查询方法
        :param resource: 资源标识符（格式：filename[::node_path] 或 filename/endpoint）
        :param auth_set: 权限过滤集合
        :param endpoint_prefix: 端点前缀过滤器
        :param return_permissions: 是否返回权限信息
        """
        # 解析资源标识符
        if '::' in resource:
            file_part, _, node_path = resource.partition('::')
            filename = file_part
        elif '/' in resource:
            # Split on the first '/' after stripping the leading slash
            filename, _, endpoint = resource.lstrip('/').partition('/')
            # filename, _, endpoint = resource.partition('/')
            node_path = f"::{endpoint}"
        else:
            filename = resource
            node_path = ""

        # 加载基础数据
        data = self.load(filename)

        # 应用权限过滤
        if auth_set is not None:
            data = self._filter_by_auth(data, auth_set)

        # 定位目标节点
        target_data = self._resolve_node(data, node_path) if node_path else data

        # 端点数据转换
        if endpoint_prefix:
            return self._format_endpoints(target_data, endpoint_prefix)
        
        # 权限信息返回
        if return_permissions:
            return self._extract_permissions(target_data)

        return target_data

    # 私有工具方法
    def _resolve_node(self, data: Dict, node_path: str) -> Any:
        """解析节点路径"""
        current = data
        for part in node_path.strip('::').split('::'):
            current = current.get(f"::{part}", {})
        return current

    def _filter_by_auth(self, data: Dict, auth_set: Set[str]) -> Dict:
        """递归权限过滤"""
        filtered = {}
        for key, value in data.items():
            if key == "data_endpoint":
                continue
                
            if isinstance(value, dict):
                filtered[key] = self._filter_by_auth(value, auth_set)
            elif isinstance(value, list):
                filtered[key] = [
                    item for item in value
                    if self._is_authorized(item, auth_set)
                ]
            else:
                filtered[key] = value
        return filtered

    def _is_authorized(self, item: Any, auth_set: Set[str]) -> bool:
        """授权检查"""
        if not isinstance(item, dict):
            return True
        return not (required := item.get('auth')) or bool(auth_set & set(required))

    def _format_endpoints(self, data: Dict, prefix: str) -> List[Dict]:
        """端点数据格式化"""
        return data
        # return [
        #     {
        #         "endpoint": key[len(prefix):],
        #         "data": val.get("data_endpoint", {"msg": "under construction"})
        #     }
        #     for key, val in data.items()
        #     if key.startswith(prefix)
        # ]

    def _extract_permissions(self, data: Dict) -> Set[str]:
        """权限信息提取"""
        if isinstance(data, dict):
            return set(data.get('auth', []))
        return set()
    
    # 保留原有方法作为快捷方式
    def get_auth_data(self, resource: str, auth_set: Set[str]) -> Dict:
        """快捷方法：获取授权数据"""
        return self.query(resource, auth_set=auth_set)

    def get_endpoint_data(self, resource: str, prefix: str = "::") -> List[Dict]:
        """快捷方法：获取端点列表"""
        return self.query(resource, endpoint_prefix=prefix)

    def get_endpoint_permissions(self, endpoint_path: str) -> Set[str]:
        """快捷方法：获取端点权限"""
        return self.query(endpoint_path, return_permissions=True)

    # 缓存管理方法
    def clear_cache(self) -> None:
        self._cache.clear()

    @property
    def cached_files(self) -> List[str]:
        return [str(path.relative_to(self.base_dir)) for path in self._cache.keys()]

    def __repr__(self) -> str:
        return f"<AppDataReader base_dir='{self.base_dir}' cached_files={len(self._cache)}>"


class Settings:
    _default_config_file = Path('local/config.json')
    _default_settings: Dict[str, Any] = {
        'jwt_key': 'waterrabbitwoodendragon',
        'listening_port': 3000
    }

    def __init__(self) -> None:
        self._data: Dict[str, Any] = self._load_settings()

    def _load_settings(self) -> Dict[str, Any]:
        """Load settings from config file or return defaults"""
        try:
            if self._default_config_file.exists():
                with self._default_config_file.open('r') as f:
                    return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"Error loading config: {e}. Using default settings")
            
        return self._default_settings.copy()

    def __enter__(self) -> 'Settings':
        return self

    def __exit__(self, 
                 exc_type: Optional[type], 
                 exc_value: Optional[BaseException], 
                 traceback: Optional[Any]) -> None:
        """Save settings on exit if no exception occurred"""
        if exc_type is None:
            self.save()

    def save(self) -> None:
        """Persist settings to config file"""
        try:
            self._default_config_file.parent.mkdir(parents=True, exist_ok=True)
            with self._default_config_file.open('w') as f:
                json.dump(self._data, f, indent=2)
        except (OSError, TypeError) as e:
            print(f"Error saving config: {e}")

    def __getattr__(self, name: str) -> Any:
        """Allow attribute-style access to settings"""
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"'Settings' object has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        """Handle special attributes and store others in _data"""
        if name in ('_data', '_default_config_file', '_default_settings'):
            super().__setattr__(name, value)
        else:
            self._data[name] = value

    def __contains__(self, name: str) -> bool:
        """Support 'in' operator checks"""
        return name in self._data

    def get(self, name: str, default: Optional[Any] = None) -> Any:
        """Safe getter with default value"""
        return self._data.get(name, default)