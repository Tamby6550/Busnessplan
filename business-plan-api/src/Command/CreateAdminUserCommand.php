<?php

namespace App\Command;

use App\Manager\User\CreateUserManager;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Crée l'utilisateur administrateur par défaut si il n'existe pas déjà.
 * Utilisé par setup.bat lors de l'installation initiale.
 *
 * Usage : php bin/console app:create-admin-user
 */
#[AsCommand(
    name: 'app:create-admin-user',
    description: "Crée l'utilisateur administrateur par défaut (installation initiale).",
)]
class CreateAdminUserCommand extends Command
{
    public function __construct(
        private readonly CreateUserManager $createUserManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $user = $this->createUserManager->create(
                email:         'admin@businessplan.mg',
                plainPassword: 'Admin@2026',
                firstName:     'Admin',
                lastName:      'BusinessPlan',
                isAdmin:       true,
            );

            $io->success(sprintf(
                'Utilisateur admin créé : %s (id=%d)',
                $user->getEmail(),
                $user->getId(),
            ));

            return Command::SUCCESS;
        } catch (UniqueConstraintViolationException) {
            $io->note('Utilisateur admin déjà existant — aucune action effectuée.');
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $io->error('Erreur : ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
