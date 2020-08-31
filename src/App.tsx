import React, { useState, useCallback, useMemo, useEffect } from "react";
import "./App.css";

// key for locaStorage item
const STARRED_REPOS = "STARRED_REPOS";
const githubIcon = require("./github.svg");

const App = () => {
  const [repos, setRepos]: any = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [sortByName, setSortByName] = useState(0); // 0 = no sort, 1 = asc, 2 = desc
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");

  // Make initial request when Component mounts
  const init = useCallback(async () => {
    try {
      setLoading(true);
      const items: any[] = await getRepos();
      setRepos(items);
    } catch (error) {
      setError("Failed to get Repositories. Try reloading the page.");
    } finally {
      setLoading(false);
    }
  }, []);
  // useMemo will execute before first render as opposed to useEffect
  useMemo(() => init(), []);
  // sync starred repos ids with localstorage
  // keep state and localStorage persistent
  useEffect(() => {
    // only sync when repos exists
    if (repos.length !== 0) {
      // get ids from starred repos
      const starredIds = repos.filter((r) => r.starred).map((r) => r.id);
      // save starred repos to localStorage
      localStorage.setItem(STARRED_REPOS, JSON.stringify(starredIds));
      // get all languages that are present in fetched repos
      const allLanguages = repos.reduce((prev, curr) => {
        if (!!curr.language && !prev.includes(curr.language)) {
          return [...prev, curr.language];
        }
        return prev;
      }, []);
      // set languages for select langauge filter options
      setLanguages(allLanguages);
    }
  }, [repos, setLanguages]);
  // handler to filter for starred repositories
  const toggleStarredOnly = useCallback(() => setStarredOnly(!starredOnly), [
    starredOnly,
    setStarredOnly
  ]);
  // handler for selecting language
  const handleSelectLanguage = useCallback(
    ({ target: { value } }) => setSelectedLanguage(value),
    [setSelectedLanguage]
  );
  // handler for starring a repository
  const starRepo = useCallback(
    (id) =>
      setRepos(
        repos.map((r) =>
          r.id === id
            ? {
                ...r,
                starred: !r.starred,
                stars: r.stars + (r.starred ? -1 : 1)
              }
            : r
        )
      ),
    [repos, setRepos]
  );
  // handler for sorting repos by name (desc, asc)
  const handleSortByName = useCallback(
    () => setSortByName(sortByName === 2 ? 0 : sortByName + 1),
    [sortByName, setSortByName]
  );
  // reduce repos when name is sorted
  const sortedRepos = useMemo(() => {
    if (sortByName === 0) {
      return repos;
    } else if (sortByName === 1) {
      // ascending order
      return [...repos].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // descending order
      return [...repos].sort((a, b) => b.name.localeCompare(a.name));
    }
  }, [repos, sortByName]);
  // reduce repos when language filter is given
  const filteredRepos = useMemo(() => {
    if (!!selectedLanguage) {
      return sortedRepos.filter((r) =>
        selectedLanguage === "null" // all repos that dont have a language
          ? !r.language
          : r.language === selectedLanguage
      );
    }
    return sortedRepos;
  }, [sortedRepos, selectedLanguage]);
  // reduce repos when starred filter is set
  const displayedRepos = useMemo(() => {
    if (starredOnly) {
      return filteredRepos.filter((r) => r.starred);
    }
    return filteredRepos;
  }, [filteredRepos, starredOnly]);

  return (
    <div className="App">
      <header className="content">
        <h1>Popular Github Repositories</h1>
      </header>
      <menu className="content">
        <div className="flex-aligned">
          <span className="flex-aligned">
            <button onClick={handleSortByName} className="flex-aligned">
              <label>Name</label>
              <i className="material-icons">
                {sortByName === 0
                  ? "unfold_more"
                  : sortByName === 1
                  ? "expand_more"
                  : "expand_less"}
              </i>
            </button>
            <select onChange={handleSelectLanguage} name="selectLanguage">
              <option value="">Filter by language:</option>
              <option value="null">No Language</option>
              {languages.map((l, i) => (
                <option value={l} key={i}>
                  {l}
                </option>
              ))}
            </select>
          </span>
          <button className="flex-aligned" onClick={toggleStarredOnly}>
            <label>Starred Only</label>
            <i className="material-icons">
              {starredOnly ? "star" : "star_border"}
            </i>
          </button>
        </div>
      </menu>
      <section className="content">
        {loading ? (
          <h2>Loading Repos...</h2>
        ) : error ? (
          <h2>{error}</h2>
        ) : displayedRepos.length === 0 ? (
          <h2>No Repos found &#128559;</h2>
        ) : (
          <ul className="repo-list">
            {displayedRepos.map((r, i) => (
              <Repo key={i} {...r} starRepo={starRepo} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const Repo = ({
  name,
  description,
  id,
  stars,
  url,
  starRepo,
  starred,
  language
}) => {
  // handler to toggle star repo
  const handleClickStar = useCallback(() => {
    starRepo(id);
  }, [id, starRepo]);

  return (
    <li className="repo-list_item" id={id}>
      <h2>
        {name}
        <small>{language && ` (${language})`}</small>
      </h2>
      <p>{description}</p>
      <aside>
        <span className="flex-aligned justify-end" onClick={handleClickStar}>
          {stars}
          <i className="material-icons">{starred ? "star" : "star_border"}</i>
        </span>
        <a
          className="flex-aligned justify-end align-start"
          href={url}
          target="_blank"
        >
          <label>Repository</label>
          <img src={githubIcon} height="20px" />
        </a>
      </aside>
    </li>
  );
};

// check if a repo is starred when making initial request
const isRepoStarred = (id: string) => {
  const starredRepos = JSON.parse(localStorage.getItem(STARRED_REPOS) || "[]");
  return !!starredRepos.find((starredRepoId: string) => starredRepoId === id);
};
// fetch popular repos from last week on github.
const getRepos = async () => {
  try {
    // exact date, one week ago
    const lastWeek: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // format date
    const created: string = `${lastWeek.getFullYear()}-${(
      "0" +
      (lastWeek.getMonth() + 1)
    ).slice(-2)}-${("0" + lastWeek.getDate()).slice(-2)}`;
    // request url
    const url: string = `https://api.github.com/search/repositories?q=created:>${created}&sort=stars&order=desc`;
    const res = await fetch(url);
    // throw error when github query fails
    if (res.status !== 200) {
      throw new Error(res.statusText);
    }
    const data = await res.json();
    // reduce repos to information needed in App
    const reducedItems = data.items.map(
      ({
        name,
        description,
        id,
        stargazers_count: stars,
        html_url: url,
        language
      }) => {
        // check in localStorage if repo is starred
        const starred = isRepoStarred(id);
        return {
          name,
          description,
          id,
          stars,
          url,
          starred,
          language
        };
      }
    );
    return reducedItems;
  } catch (error) {
    throw new Error(error);
  }
};

export default App;
