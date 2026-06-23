from .questions import router as questions_router
from .practice import router as practice_router
from .import_api import router as import_router
from .flashcards import router as flashcards_router
from .exam import router as exam_router

__all__ = ["questions_router", "practice_router", "import_router", "flashcards_router", "exam_router"]