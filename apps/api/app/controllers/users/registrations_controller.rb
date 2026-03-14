class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  private

  def respond_with(resource, _opts = {})
    if resource.persisted?
      render json: {
        message: 'signed_up',
        user: {
          id: resource.id,
          email: resource.email,
          role: resource.role
        }
      }, status: :created
    else
      render json: {
        message: 'signup_failed',
        errors: resource.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
end
