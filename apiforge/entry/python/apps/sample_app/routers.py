from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import services

router = APIRouter(tags=["sample-app"])


class ItemCreate(BaseModel):
    name: str = Field(min_length=1)


class Item(ItemCreate):
    id: str


@router.get("/items")
def list_items() -> list[Item]:
    return services.list_items()


@router.get("/items/{item_id}")
def get_item(item_id: str) -> Item:
    item = services.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return item


@router.post("/items", status_code=201)
def create_item(payload: ItemCreate) -> Item:
    return services.create_item(payload.name)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str):
    if not services.delete_item(item_id):
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
