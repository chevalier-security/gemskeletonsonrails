class ApplicationController < ActionController::API
	include CanCan::ControllerAdditions

	before_action :authenticate_user!, unless: :devise_controller?

	rescue_from CanCan::AccessDenied do |_exception|
		render json: { error: 'forbidden' }, status: :forbidden
	end
end
