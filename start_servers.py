import subprocess
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env.development
load_dotenv(dotenv_path='.env.development')

# Get the absolute path of the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Get current environment variables and pass them to subprocesses
env_vars = os.environ.copy()

# List of scripts to run with their absolute paths
scripts = [
    os.path.join(script_dir, "flask_pos_server.py"),
    os.path.join(script_dir, "backend-python", "main_simple.py"),
    os.path.join(script_dir, "backend-python", "check_price_api.py") # Add new API here
]

# Start each script in a new process
processes = []
for script in scripts:
    try:
        # We use sys.executable to ensure we're using the same python interpreter
        # For the FastAPI server, we need to run it with uvicorn if it's not run directly
        if "main_simple.py" in script or "check_price_api.py" in script:
             # Assuming the venv is in the backend-python directory
            venv_python = os.path.join(script_dir, "backend-python", "venv", "bin", "python")
            if not os.path.exists(venv_python):
                print(f"Warning: Virtual environment python not found at {venv_python}. Using system python.")
                venv_python = sys.executable
            
            # Check if uvicorn is installed in the virtualenv
            # A more robust solution would be to activate the venv, but this is simpler for now.
            process = subprocess.Popen([venv_python, script], env=env_vars)

        else:
            process = subprocess.Popen([sys.executable, script], env=env_vars)

        processes.append(process)
        print(f"Started {os.path.basename(script)} with PID: {process.pid}")

    except FileNotFoundError:
        print(f"Error: Could not find {script}. Please check the file path.")
        # Terminate other processes if one fails
        for p in processes:
            p.terminate()
        sys.exit(1)


print("\nBoth servers are starting up...")
print("Press Ctrl+C to stop all servers.")

try:
    # Wait for all processes to complete
    for process in processes:
        process.wait()
except KeyboardInterrupt:
    print("\nStopping all servers...")
    for process in processes:
        process.terminate()
    print("All servers have been stopped.")
