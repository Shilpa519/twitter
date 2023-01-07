const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const app = express();
app.use(express.json());

const initiDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initiDBAndServer();

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const selectUserQuery = `SELECT * FROM user 
                WHERE username = '${username}';`;
  let dbResponse = await db.get(selectUserQuery);
  if (dbResponse !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 6);
      const postQuery = `INSERT INTO user(username,
            password,name,gender)
            VALUES ('${username}',
                    '${hashedPassword}',
                    '${name}',
                    '${gender}');`;
      dbResponse = await db.run(postQuery);
      const userId = dbResponse.lastDB;
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user 
        WHERE username = '${username}';`;
  const dbResponse = await db.get(selectUserQuery);
  if (dbResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbResponse.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "Twitter");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "Twitter", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const convertTweetsToCC = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

convertToLikes = (dbObject) => {
  return dbObject.username;
};

convertToReplies = (dbObject) => {
  return {
    username: dbObject.username,
    reply: dbObject.reply,
  };
};

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const selectTweetsQuery = `SELECT 
            user.username,
            tweet.tweet,
            tweet.date_time
            FROM tweet 
            INNER JOIN user
            ON tweet.user_id = user.user_id
            INNER JOIN follower
            ON tweet.user_id = follower.following_user_id
            WHERE tweet.user_id = ${followers.following_user_id}
            ORDER BY date_time
            LIMIT 4 OFFSET 0;`;
  const dbResponse = await db.all(selectTweetsQuery);
  if (dbResponse !== undefined) {
    response.send(dbResponse.map((eachItem) => convertTweetsToCC(eachItem)));
  } else {
    response.send(401);
    response.status("Invalid JWT Token");
  }
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  if (authenticateToken === undefined) {
    response.send(401);
    response.send("Invalid JWT Token");
  } else {
    const selectFollowersQuery = `SELECT user.username
    FROM user INNER JOIN follower
    ON user.user_id = follower.following_user_id;`;
    const dbResponse = await db.all(selectFollowersQuery);
    if (dbResponse !== undefined) {
      response.send(dbResponse);
    } else {
      response.status(400);
      response.send("Invalid JWT Token");
    }
  }
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const selectFollowersQuery = `SELECT user.username
    FROM user INNER JOIN follower
    ON user.user_id = follower.follower_user_id;`;
  const dbResponse = await db.all(selectFollowersQuery);
  response.send(dbResponse);
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const followerId = request.params;
  console.log(followerId);
  const selectTweetQuery = `SELECT tweet.tweet,
                 COUNT(like.tweet_id) as likes,
                 COUNT(reply.tweet_id) as reply,
                 tweet.date_time as dateTime 
                 FROM tweet
                 INNER JOIN follower 
                 ON  tweet.user_id= follower.following_user_id
                 INNER JOIN like 
                 ON  tweet.tweet_id= like.tweet_id
                 INNER JOIN reply 
                 ON  tweet.tweet_id= reply.tweet_id
                 WHERE tweet.tweet_id = ${followerId.tweetId}`;
  const dbResponse = await db.get(selectTweetQuery);
  console.log(dbResponse);
  if (dbResponse.tweet !== null) {
    response.send(dbResponse);
  } else {
    response.status(400);
    response.send("Invalid Request");
  }
});

app.get(
  "/tweets/:tweetId/likes",
  authenticateToken,
  async (request, response) => {
    const followerId = request.params;
    console.log(request.params);
    const selectTweetQuery = `SELECT user.username 
                 FROM user
                 INNER JOIN tweet 
                 ON tweet.user_id = user.user_id
                 INNER JOIN follower
                 ON tweet.user_id = follower.following_user_id
                 
                 INNER JOIN like 
                 ON  tweet.tweet_id= like.tweet_id
                 WHERE tweet.tweet_id = ${followerId.tweetId}`;
    const dbResponse = await db.all(selectTweetQuery);
    console.log(dbResponse);
    if (dbResponse.username !== null) {
      response.send(
        `"likes": ['${dbResponse.map((eachItem) => convertToLikes(eachItem))}']`
      );
    } else {
      response.status(400);
      response.send("Invalid Request");
    }
  }
);

app.get(
  "/tweets/:tweetId/replies",
  authenticateToken,
  async (request, response) => {
    const followerId = request.params;
    console.log(request.params);
    const selectTweetQuery = `SELECT user.username ,
                    reply.reply
                 FROM user
                 INNER JOIN tweet 
                 ON tweet.user_id = user.user_id
                 INNER JOIN follower
                 ON reply.user_id = follower.following_user_id
                 
                 INNER JOIN reply 
                 ON  tweet.tweet_id= reply.tweet_id
                 WHERE tweet.tweet_id = ${followerId.tweetId}`;
    const dbResponse = await db.all(selectTweetQuery);
    const length = dbResponse.length;
    console.log(dbResponse[2]);
    let list = [];

    if (dbResponse.length !== 0) {
      for (let i in length) {
        list.append(dbResponse[i]);
        console.log(list);
      }
      response.send(`"replies": [${list}]`);
    } else {
      response.status(400);
      response.send("Invalid Request");
    }
  }
);

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const selectUserQuery = `select 
            tweet.tweet as tweet,
            count(like.tweet_id) as likes,
            count(reply.tweet_id) as replies,
            tweet.date_time as dateTime
            from tweet inner join reply
            on reply.tweet_id = tweet.tweet_id
            inner join like
            on tweet.tweet_id = like.tweet_id
            inner join follower
            on tweet.user_id = follower.follower_user_id
                where tweet.user_id = follower.follower_user_id`;
  const dbResponse = await db.get(selectUserQuery);
  if (dbResponse.length !== 0) {
    response.send(dbResponse);
  } else {
    response.status(400);
    response.send("Invalid Request");
  }
});

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const postTweetQuery = `INSERT INTO tweet(tweet)
    VALUES ('${tweet}');`;
  const dbResponse = await db.run(postTweetQuery);
  const tweetId = dbResponse.lastDB;
  if (dbResponse.length !== 0) {
    response.send("Created a Tweet");
  }
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const tweetId = request.params;
    console.log(tweetId);
    const deleteTweetQuery = `DELETE FROM tweet
            WHERE tweet_id = ${tweetId.tweetId};`;
    const dbResponse = await db.run(deleteTweetQuery);
    if (dbResponse !== undefined) {
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
