class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new

    can :read, :health

    return unless user.persisted?

    can :read, :profile

    return unless user.admin?

    can :manage, :all
  end
end
