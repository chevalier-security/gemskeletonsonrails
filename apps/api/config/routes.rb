Rails.application.routes.draw do
  devise_for :users,
             defaults: { format: :json },
             path: '',
             path_names: {
               sign_in: 'login',
               sign_out: 'logout',
               registration: 'signup'
             },
             controllers: {
               sessions: 'users/sessions',
               registrations: 'users/registrations'
             }

  get '/profile', to: 'profiles#show'
  get '/health', to: proc { [200, { 'Content-Type' => 'application/json' }, ['{"status":"ok"}']] }
end
