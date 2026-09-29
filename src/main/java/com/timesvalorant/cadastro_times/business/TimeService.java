package com.timesvalorant.cadastro_times.business;

import com.timesvalorant.cadastro_times.infrastructure.entitys.Time;
import com.timesvalorant.cadastro_times.infrastructure.repository.TimeRepository;
import org.springframework.stereotype.Service;

@Service
public class TimeService {
    private final TimeRepository repository;

    public TimeService(TimeRepository repository) {

        this.repository = repository;
    }

    public void salvarTime(Time time){

        repository.saveAndFlush(time);
    }

    public Time buscarTimeporNome(String nome){
        return repository.findByNome(nome).orElseThrow(
                () -> new RuntimeException("Nome não encontrado")
        );
    }

    public void deletarTimeporNome(String nome){
        repository.deleteByNome(nome);
    }

    public void atualizarTimePorId(Integer id, Time time){
        Time timeEntity = repository.findById(id).orElseThrow(() -> new RuntimeException("Time não encontrado"));
        Time timeAtualizado = Time.builder()
                .nome(time.getNome() != null ? time.getNome() : timeEntity.getNome())
                .tier(time.getTier() != null ? time.getTier() : timeEntity.getTier())
                .starPlayer(time.getStarPlayer() != null ? time.getStarPlayer() : timeEntity.getNome())
                .internacionais(time.getInternacionais() != null ? time.getInternacionais() : timeEntity.getInternacionais())
                .id(timeEntity.getId())
                .build();
        repository.saveAndFlush(timeAtualizado);
    }
}
