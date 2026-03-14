class Users::SessionsController < Devise::SessionsController
  respond_to :json

  private

  def respond_with(resource, _opts = {})
    render json: {
      message: 'logged_in',
      user: {
        id: resource.id,
        email: resource.email,
        role: resource.role
      }
    }, status: :ok
  end

  def respond_to_on_destroy
    render json: { message: 'logged_out' }, status: :ok
  end
end
