import os
import dotenv
import logging
import datetime

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

dotenv.load_dotenv()

def get_log_file_name():
        current_date = datetime.datetime.now().strftime("%Y-%m-%d")
        log_file_name = f"{current_date}.log"
        return log_file_name
    
def log_handler():
    log_file_path = os.path.join(os.getcwd(), project_root,'logs', get_log_file_name())
    
    if not os.path.isfile(log_file_path):
        print(f"Log file {log_file_path} does not exist. So creating the log file")
        file = open(log_file_path, 'w')
        file.write("Log file created")
        file.close()
        
    logging.basicConfig(
        filename = log_file_path,
        level = logging.INFO,
        format = '%(asctime)s [%(levelname)s] - %(message)s'
    )
    
    return logging.getLogger(__name__)