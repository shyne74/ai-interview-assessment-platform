import flask
import codeforces_wrapper


app = flask.Flask(__name__)
PROBLEM_LINK = 'https://codeforces.com/problemset/problem/'


@app.route('/', methods=['GET'])
def home():
    problem_id = flask.request.args.get('id')
    if not problem_id:
        return flask.jsonify({"error": "Missing 'id' parameter"}), 400
    try:
        data = codeforces_wrapper.parse_problem(PROBLEM_LINK + problem_id)
        return flask.jsonify(data), 200
    except ValueError as ve:
        return flask.jsonify({"error": str(ve)}), 400
    except Exception as e:
        return flask.jsonify({"error": str(e)}), 500

