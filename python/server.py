import uvicorn
from fastapi import FastAPI, Response, APIRouter, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from src.services.logger_service import log_handler
from database import DatabaseService
from models.user import User
from models.subject import Subject
import jwt
import time

logger = log_handler()

app = FastAPI()
router = APIRouter()

@app.middleware("http")
async def check_authorization(request: Request, call_next):
    start_time = time.time()
    token = request.headers.get("Authorization") or request.cookies.get("token")
    
    if not token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Authorization header is missing"},
        )

   # In case if you don't want to use the basic auth
    '''
    if token.startswith("Basic "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Basic authentication is not supported! Please use Bearer token"},
        )
    '''
    
    def check_for_token_expiry(token):
        try:
            decoded_token = jwt.decode(token, "secret", algorithms=["HS256"])
            return decoded_token["exp"] < time.time()
        except jwt.InvalidTokenError:
            return False
    
    is_token_expired = check_for_token_expiry(token)

    if is_token_expired:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Token has expired"},
        )

    just_token = None

    if token.startswith("Bearer "):
        just_token = token.split(" ")[1]

    if not token.startswith("Bearer "):
        if not request.cookies.get("token"):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token is missing"},
            )

        just_token = request.cookies.get("token")
    
    '''
        try:
            decoded_token = jwt.decode(just_token, options={ "verify_signature": False })
            
            # add them based on your requirement
            username = decoded_token["attributes"].get("username")
            user_email = decoded_token["attributes"].get("email")

            request.state.decoded = {
                "user": username,
                "user_email": user_email
            }
            logger.info(f"{username} {request.method} {request.url}")
        except jwt.InvalidTokenError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid token"},
            )
        
        request.state.auth = token if token.startswith("Bearer ") else f"Bearer {just_token}" 
    '''
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    logger.info(
        f"{request.method} {request.url} - Status: {response.status_code} - Processing time: {process_time:.3f}s"
    )
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error for request {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@router.get("/py/sample", response_class=Response)
async def read_root() -> Response:
    return Response(content="Bootstraps Python server is running!", media_type="text/plain")


# include all the routes of plugins here    
app.include_router(router)

if __name__ == "__main__":
    try:
        logger.info("Python Server is running on port 3001")
        database_service = DatabaseService([User, Subject]).connect_to_db()
        uvicorn.run(app, host="0.0.0.0", port=3001)
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        raise e