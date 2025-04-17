from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from typing import Any, Type, TypeVar, Generic
from base import Base

ModelType = TypeVar("ModelType", bound = declarative_base)

class DatabaseService(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model
        self.db: Session = self.connect_to_db()
        self.base = Base

    def connect_to_db(self):
        engine = create_engine("sqlite:///./database/sqlite.db")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind = engine)

        return SessionLocal()

    def create(self, data: dict[str, Any]) -> ModelType:
        """Create a new record."""
        instance = self.model(**data)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def get_by_id(self, id: Any) -> ModelType | None:
        """Get a record by id."""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[ModelType]:
        """Get all records with pagination."""
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def update(self, id: Any, data: dict[str, Any]) -> ModelType | None:
        """Update a record."""
        instance = self.get_by_id(id)
        if instance:
            for key, value in data.items():
                setattr(instance, key, value)
            self.db.commit()
            self.db.refresh(instance)
        return instance

    def delete(self, id: Any) -> bool:
        """Delete a record."""
        instance = self.get_by_id(id)
        if instance:
            self.db.delete(instance)
            self.db.commit()
            return True
        return False

