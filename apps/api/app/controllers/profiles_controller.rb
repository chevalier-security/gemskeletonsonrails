class ProfilesController < ApplicationController
  def show
    authorize! :read, :profile

    render json: {
      id: current_user.id,
      email: current_user.email,
      role: current_user.role
    }
  end
end
