from uuid import uuid4

_items: dict[str, dict] = {}


def list_items() -> list[dict]:
    return list(_items.values())


def get_item(item_id: str) -> dict | None:
    return _items.get(item_id)


def create_item(name: str) -> dict:
    item = {"id": str(uuid4()), "name": name}
    _items[item["id"]] = item
    return item


def delete_item(item_id: str) -> bool:
    return _items.pop(item_id, None) is not None
