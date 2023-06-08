from flask import Flask
app = Flask(__name__)

@app.route('/devices')
def get_devices():
  return {"devices": []}

if __name__ == "__main__":
  app.run(debug=True)
