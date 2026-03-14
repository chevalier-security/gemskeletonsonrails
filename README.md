# gem skeletons on rails

this is mostly for me. it makes things easier for me so i put it together as a basic layout that i can create a site off of. 
a small monorepo for application skeleton building that utilizes ruby on rails, typescript, react, and node.
our goal here is to create some functional and open source tools for people working in rails and heavy javascript. 
i'm adding a custom login interface first. how it's going to work is you're going to have the most basic possible layout for your typescript/ react, and with that you can connect it via api dependencies in whatever ;you use to deploy your application. then, you can use your rails to connect securely through its own api structure to your database. it can store login data for you. i'll add safeguards too, so that a person cannot pretend to be someone else registered in the database very easily, as we've seen recently in a vibecoded deployed app. also we'll go over a couple of ideas to prevent cross site scripting, and from here, you'll hopefully have a good idea of how to do this stuff. it's fun! i love ruby on rails and i'm going to have a lot of fun contributing to this. if you'd like to contribute, i'd be happy to work with any contributions. please leave feedback. i want to get better at rails.

you'll find in apps/api/Gemfile some important things for login flow. you have gem 'devise' which adds authentication primitives: -password hashing (verification), token hooks, and login/logout controller support.
gem 'devise-jwt': adds jwt support on top of devise. issues tokens, validates tokens per request, supports revocation.

gem 'cancancan', probably the most important part of the ruby app so far. it adds authorization rules. this means it will define what a signed-in user can and cannot do via Ability class. also, because ruby on rails.. cancancan is flexible and easy. it'll avoid writing permissions twice. no more will you have to worry about checking permissions on a single object, and when fetching records from the database. 

another thing. devise is still really important!!!! there are other ways to construct this, but using something like devise will prevent you from needing to build something on your own in some cases. in some cases you should probably build your own authentication/ login handler. also, i can't say that cancancan is absolutely the best for every project you construct. you should take the time to learn for yourself what the library can and cannot do (lol). if i had known about cancancan when i first started constructing authentication/ authorization flows i would have probably saved myself like 10 hours of writing lines in rails on random projects. i believe that everyone serious about rails should probably do this. even if you're mostly vibecoding rails authentication/ authorization flows (bad idea because large language models will struggle to grasp every specific need of your project), it'd be a good idea first to learn about cancancan, devise, rack-attack, etc. because none by itself is capable of everything, and all will limit the capabilities of your applications in some way  or another. 

please leave feedback! i'm not great at programming, but i'm always trying to get better. i love the community, and i love ruby on rails, so if you know a thing or two about rails, please please please let me know if there's ever anything i can improve on. in the future, if you'd like to ask for advice or collaboration on some kind of project. i might be open to it. thank you for taking the time to read this. lots of love. 

## structure

```text
apps/
  api/        # rails api app
  web/        # react + typescript app (vite here)
packages/
  core/       # shared typescript definitions and helpers
```

## quick start

1. install js workspace dependencies:

```bash
npm install
```

2. start the web app:

```bash
npm run dev:web
```

3. install rails gems and start api app:

```bash
cd apps/api
bundle install
bundle exec rails s -p 3000
```

the api exposes a starter endpoint at `GET /health`.

## Auth + Security Guide (Devise First)

if you're newer to rails auth, this is the exact order i'd learn it in for this app. we're going to keep it practical and not overcomplicate it.

### 1. Devise (who is this user?)

devise is your identity layer. it handles user creation, password validation, login/logout flows, reset password, and the base helpers you'll use everywhere (`current_user`, `authenticate_user!`, etc).

install + generate basics:

```bash
cd apps/api
bundle exec rails generate devise:install
bundle exec rails generate devise User role:integer
bundle exec rails db:migrate
```

basic user model example:

```ruby
# apps/api/app/models/user.rb
class User < ApplicationRecord
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :validatable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist

  enum role: { user: 0, admin: 1 }
end
```

why this matters:
- you don't have to hand-roll password logic
- fewer auth bugs from custom code
- consistent rails conventions (easy for collaborators)

### 2. Devise-JWT (how does auth stay valid in an API?)

`devise-jwt` takes devise identity and makes it API-friendly. after login, the server issues a JWT; future requests send `Authorization: Bearer <token>`.

routes example:

```ruby
# apps/api/config/routes.rb
Rails.application.routes.draw do
  devise_for :users,
    defaults: { format: :json },
    path: '',
    path_names: {
      sign_in: 'login',
      sign_out: 'logout',
      registration: 'signup'
    }

  get '/health', to: proc { [200, { 'Content-Type' => 'application/json' }, ['{"status":"ok"}']] }
end
```

revocation strategy example (logout invalidates token):

```ruby
# apps/api/app/models/jwt_denylist.rb
class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  self.table_name = 'jwt_denylist'
end
```

what this gives you:
- stateless auth for frontend + api apps
- token invalidation on logout/revocation
- clean request auth pattern for react clients

### 3. CanCanCan (what can this user do?)

cancancan is authorization. once devise confirms identity, cancancan answers permissions. this keeps role logic in one place instead of scattering `if user.admin?` checks all over controllers.

ability example:

```ruby
# apps/api/app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new

    if user.admin?
      can :manage, :all
    else
      can :read, User, id: user.id
      cannot :destroy, User
    end
  end
end
```

controller usage:

```ruby
# apps/api/app/controllers/users_controller.rb
class UsersController < ApplicationController
  before_action :authenticate_user!

  def show
    @user = User.find(params[:id])
    authorize! :read, @user
    render json: @user
  end
end
```

what this gives you:
- centralized permission rules
- fewer accidental data leaks
- easier to test role behavior

### 4. Rack-Attack (slow down abuse)

`rack-attack` helps protect login endpoints from brute force attempts and noisy traffic.

initializer example:

```ruby
# apps/api/config/initializers/rack_attack.rb
class Rack::Attack
  throttle('logins/ip', limit: 5, period: 20.seconds) do |req|
    req.ip if req.path == '/login' && req.post?
  end

  throttle('logins/email', limit: 5, period: 20.seconds) do |req|
    if req.path == '/login' && req.post?
      req.params.dig('user', 'email')&.downcase&.strip
    end
  end
end
```

what this gives you:
- less credential-stuffing risk
- more predictable auth load under attack
- one place to tune API abuse limits

### 5. bcrypt (password hashing foundation)

`bcrypt` is the algorithm layer devise uses for password hashing. you store password hashes, never raw passwords.

manual bcrypt example (for understanding only):

```ruby
digest = BCrypt::Password.create('super_secret_password')
BCrypt::Password.new(digest) == 'super_secret_password' # true
```

in practice, devise handles this for you via `encrypted_password`.

we're gonna use this for api hashing instead. 

### minimal secure request flow in this app

1. user signs up/signs in with devise.
2. devise-jwt issues token.
3. client sends token on each protected request.
4. `authenticate_user!` verifies identity.
5. `authorize!` (cancancan) checks permission for that action.
6. rack-attack throttles repeated abuse on auth endpoints.

if you understand those six steps, you're in a great place to build secure rails APIs without reinventing every auth piece from scratch.

## sqlite3 + puma (the basics)

cool, now for two gems that are less flashy than auth but still super important for getting your app alive in development.

### sqlite3 (where your local app data lives)

`sqlite3` is the default database in this rails api right now. it stores your app data in a local file database, which is great for getting started quickly.

why i like it for this stage:
- setup is simple
- great for prototyping and learning rails migrations/models
- no separate db server needed just to start building

very basic things you can do:

```bash
cd apps/api
bundle exec rails db:create
bundle exec rails db:migrate
bundle exec rails db:seed
```

example model you can persist in sqlite:

```ruby
class Note < ApplicationRecord
  validates :title, presence: true
end
```

now rails + sqlite can store and retrieve records with no extra infrastructure:

```ruby
Note.create!(title: 'hello rails', body: 'first local record')
Note.where(title: 'hello rails')
```

important note: for bigger production workloads, teams usually move to postgres (or another server database). sqlite is still awesome for local development and early iterations.

### getting started with postgres (when you outgrow sqlite)

if you're ready to level up from local-file db to a server db, postgres is the most common rails move. it's stable, fast, and has better concurrency behavior for real apps. use postgres. if you're not sure how to use postgres, it's probably a good idea to work with postgres a bit before you work with these gems.. just a little bit. it's super easy to do yourself i promise

the rails way to switch is usually:

```bash
cd apps/api
bundle add pg
```

then update `apps/api/config/database.yml` for postgres connection values:

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS", 5) %>
  host: <%= ENV.fetch("POSTGRES_HOST", "127.0.0.1") %>
  port: <%= ENV.fetch("POSTGRES_PORT", 5432) %>
  username: <%= ENV.fetch("POSTGRES_USER", "postgres") %>
  password: <%= ENV.fetch("POSTGRES_PASSWORD", "postgres") %>
```

then run:

```bash
bundle exec rails db:create
bundle exec rails db:migrate
```

why postgres is nice once your app grows:
- safer multi-user writes
- better indexing/query tooling
- closer to what many production teams run

### docker or podman for containerized setup (security + consistency)

for local consistency and cleaner isolation, containerizing postgres is super helpful. docker is common, podman is a solid alternative if you prefer daemonless/rootless workflows.

simple `docker-compose.yml` example for postgres:

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: api_development
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

start/stop:

```bash
docker compose up -d db
docker compose down
```

security-minded tips (easy stuff):
- never hardcode real db passwords in git
- use env vars for secrets (`POSTGRES_PASSWORD`, jwt keys, rails master key)
- bind only needed ports
- pin image tags (example: `postgres:16`) instead of `latest`

if you choose podman instead, the same compose spec usually works with `podman compose` and gives a very similar developer flow.

### puma (the web server that runs your rails app)

`puma` is the app server. when you run `rails s`, puma is what actually boots and serves HTTP requests.

what puma is responsible for:
- listening on a port (example: `3000`)
- handling concurrent requests using threads/workers
- staying fast/reliable while your app routes requests to controllers

run it locally:

```bash
cd apps/api
bundle exec rails s -p 3000
```

you can also tune thread settings in `apps/api/config/puma.rb`.

example snippet:

```ruby
threads_count = ENV.fetch('RAILS_MAX_THREADS', 5)
threads threads_count, threads_count
port ENV.fetch('PORT', 3000)
environment ENV.fetch('RAILS_ENV', 'development')
```

simple mental model:
1. browser/frontend sends request.
2. puma receives request.
3. rails routes it.
4. controller/model talks to sqlite.
5. response comes back through puma.

if auth gems are your security brain, sqlite3 is your local memory and puma is your heartbeat.

## typescript + react + node.js with rails

yes, this stack works really well together. quick mental model:
- rails = backend api + auth + database
- react/typescript = frontend ui + typed client-side logic
- node.js = the runtime for frontend tooling (vite/dev server/build), not a replacement for rails

in this repo, `apps/web` is the react + typescript app and `apps/api` is the rails api app.

### run both apps locally

terminal 1 (web):

```bash
npm run dev:web
```

terminal 2 (api):

```bash
cd apps/api
bundle exec rails s -p 3000
```

the flow is:
1. react app runs on `http://localhost:5173`.
2. rails api runs on `http://localhost:3000`.
3. frontend sends http requests to rails endpoints.
4. rails responds with json.

### minimal frontend auth example included in this repo

you can now look at these files for a minimal typed auth flow demo:
- `apps/web/src/api/client.ts`
- `apps/web/src/components/LoginPortal.tsx`
- `apps/web/src/App.tsx`

what it demonstrates:
- checking `GET /health` on app load
- posting credentials to `POST /signup`
- posting credentials to `POST /login`
- reading jwt token from `Authorization` response header
- storing token in `localStorage`
- calling a protected route (`/profile`) with that token

current auth endpoints in this skeleton:
- `POST /signup`
- `POST /login`
- `DELETE /logout`
- `GET /profile` (requires bearer token)
- `GET /health`

quick verification (api only):

```bash
cd apps/api

# optional demo user if you want to test login quickly
bundle exec rails runner 'u = User.find_or_initialize_by(email: "demo@example.com"); u.password = "Password123"; u.password_confirmation = "Password123"; u.role = :admin; u.save'

# login and inspect your header..... yeah this is not my favorite part of ruby but like you're definitely going to have to do it sometimes. if you want to avoid this, figure out how to use your database and how to wire your rails with your db and frontend before testing anything. often times, that's not the best route if you're working with a more security focused kind of workflow ig. 
curl -i -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"user":{"email":"demo@example.com","password":"Password123"}}'

# one-liner: login -> call /profile -> logout
TOKEN=$(curl -s -i -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"user":{"email":"demo@example.com","password":"Password123"}}' \
  | awk -F': ' '/^Authorization: / {gsub("\r", "", $2); print $2}')

curl -s http://localhost:3000/profile -H "Accept: application/json" -H "Authorization: $TOKEN"
curl -s -X DELETE http://localhost:3000/logout -H "Accept: application/json" -H "Authorization: $TOKEN"
```

basic request shape from the frontend:

```ts
await fetch('http://localhost:3000/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    user: { email, password, password_confirmation: passwordConfirmation },
  }),
})
```

and login:

```ts
await fetch('http://localhost:3000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ user: { email, password } }),
})
```

and then for protected requests:

```ts
await fetch('http://localhost:3000/profile', {
  headers: {
    Accept: 'application/json',
    Authorization: token,
  },
})
```
```bash
# if you're insane you're gonna spend a ton of time doing this nonsense in your terminal LOL: 

EMAIL="revoke$(date +%s)@example.com" && SIGNUP=$(curl -s -i -X POST http://localhost:3000/signup -H 'Content-Type: application/json' -H 'Accept: application/json' -d "{\"user\":{\"email\":\"$EMAIL\",\"password\":\"Password123\",\"password_confirmation\":\"Password123\"}}") && TOKEN=$(echo "$SIGNUP" | awk -F': ' '/^Authorization: / {gsub("\r", "", $2); print $2}') && curl -s -o /dev/null -X DELETE http://localhost:3000/logout -H "Accept: application/json" -H "Authorization: $TOKEN" && curl -i --max-time 10 http://localhost:3000/profile -H "Accept: application/json" -H "Authorization: $TOKEN"

```
fun little thing though!! you can use typescript to check the api health status, like so: 

```ts
// health-indicator.ts
export abstract class HealthIndicator {
  abstract name: string;
  status: ResourceHealth = ResourceHealth.Unhealthy;
  details: string | undefined;

  abstract checkHealth(): Promise<void>;
}

// resource-health.enum.ts
export enum ResourceHealth {
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY'
}
```
okay but like,, you're probably gonna look at client.ts now and think to yourself: "why did you use fetchHealth as an abstract class instead of the HealthIndicator you've presented here?" 

if you're at all iinterested in this.. here's why: HealthIndicator would be an object-oriented contract for multiple implementations. 
so fetchHealth is a stateless, concrete function, which is good and minimal for one endpoint. if you want more than this: i highly recommend rebuilding a bit from the typescript above. credit to: https://www.elliotdenolf.com/blog/standardized-health-checks-in-typescript

anyways, yes, typescript can do this from the frontend, so all you have to do is run the app on your localhost and open in browser to see it, no need for terminal health checks. 

if you need: dependency injection, polymorphism or whatever else to check http, cache, db, mock,, whatever. it might be a good idea. otherwise maybe fetchHealth is better. ma;ybe you don't need either!! idk i'm not your mom do what you want i just thought it was cool.

i highly doubt in deployment you'll need the endpoints + diagnostics bit of the frontend, but i left it in there so i wouldn't have to go back and fourth to testing in the terminal and seeing the frontend. 

if you do; need to use this for whatever reason, i suggest only using what you need on your frontend for good minimal api endpoint exposure, but if you have your own admin view of the app, you might want to swap the web app and api health endpoint variables/ values to real things and not just reminders of ports or localhost urls that you're going to be using.

### practical notes while wiring react to rails

- keep all api calls in one typed client module (easier to maintain)
- prefer env vars for base urls (`VITE_API_URL` in web app)
- use rails cors config to allow only trusted frontend origins
- remember: authentication (devise) and authorization (cancancan) are separate layers

if you're new to this architecture, don't worry. once you've wired one login and one protected route end-to-end, the rest starts to feel very repeatable.

## first build commands

```bash
npm install
npm run build:packages
npm run build:web
```

if you're starting the rails side for the first time too:

```bash
cd apps/api
bundle install
bundle exec rails db:migrate
```

## notes

- `apps/api/config/initializers/cors.rb` is configured for local frontend origin `http://localhost:5173`.
- `packages/core` is the minimal shared workspace package.
- `npm run build:packages` should happen before `npm run build:web` because the web app depends on the shared package.
- `npm run dev:web` runs the frontend on `http://localhost:5173` and `npm run dev:api` runs rails on `http://localhost:3000`.
- `GET /health` is the quick api check if you're trying to see whether rails is up before testing auth.
- rails 6.1 on ruby 3.2 needed `require "logger"` in `apps/api/config/boot.rb` here, so if you remove that and logger errors come back, that's why.
- the cors setup depends on `rack-cors` being present in `apps/api/Gemfile`.
- the cors setup depends on `rack-cors` being present in `apps/api/Gemfile`.

### production env vars

these need to be set when you deploy the rails api:

| variable | required | notes |
|---|---|---|
| `RAILS_MASTER_KEY` | yes | decrypts credentials. found in `config/master.key` (never commit that file) |
| `CORS_ORIGINS` | yes | comma-separated allowed frontend origins, e.g. `https://yourapp.com` |
| `RAILS_ENV` | yes | set to `production` |
| `PORT` | no | defaults to `3000` |
| `RAILS_MAX_THREADS` | no | defaults to `5` |


## fun stuff

so you can check the app.css,, if you do you'll find linear and radial gradients. those linear and radial gradients are what make the background kinda
look cool on browser. i used to just make websites all day on the indie web so i picked up a trick or two. 

thanks for reading all this stuff if you did.. wowwow!! -sage

