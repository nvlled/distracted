BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "images" (
	"image"	BLOB,
	"description"	TEXT
);
CREATE TABLE IF NOT EXISTS "user_data" (
	"key"	INTEGER UNIQUE,
	"value"	TEXT NOT NULL,
	PRIMARY KEY("key")
);
CREATE TABLE IF NOT EXISTS "distractions" (
	"filename"	TEXT NOT NULL UNIQUE,
	"md5sum"	TEXT NOT NULL,
	"data"	BLOB NOT NULL,
	PRIMARY KEY("filename")
);
CREATE TABLE IF NOT EXISTS "requests_youtube" (
	"searchQuery"	TEXT NOT NULL UNIQUE,
	"pageNum"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("searchQuery")
);
CREATE TABLE IF NOT EXISTS "requests_reddit" (
	"subreddit"	TEXT NOT NULL,
	"orderType"	TEXT NOT NULL,
	"afterID"	TEXT NOT NULL,
	"resultCount"	INTEGER NOT NULL DEFAULT 0,
	"rlUsed"	INTEGER NOT NULL DEFAULT 0,
	"rlRemaining"	INTEGER NOT NULL DEFAULT 0,
	"rlSeconds"	INTEGER NOT NULL DEFAULT 0,
	"lastUpdate"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("orderType","subreddit")
);
CREATE TABLE IF NOT EXISTS "cards" (
	"path"	TEXT NOT NULL UNIQUE,
	"md5sum"	TEXT NOT NULL,
	"numRecall"	INTEGER NOT NULL DEFAULT 0,
	"numForget"	INTEGER NOT NULL DEFAULT 0,
	"consecRecall"	INTEGER NOT NULL DEFAULT 0,
	"consecForget"	INTEGER NOT NULL DEFAULT 0,
	"interval"	INTEGER NOT NULL DEFAULT 0,
	"lastUpdate"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("path")
);
CREATE TABLE IF NOT EXISTS "card_collections" (
	"cardpath"	TEXT,
	"name"	TEXT,
	PRIMARY KEY("name","cardpath")
);
COMMIT;
